import test from 'node:test'
import assert from 'node:assert/strict'
import {
  EMPTY_DRAFT,
  STATUS_TEXT,
  ageOn,
  documentPath,
  draftToFields,
  firstIncompleteStep,
  isEditable,
  isIsoDate,
  maskId,
  normalizePhone,
  readIdNumber,
  rowToDraft,
  todayIso,
  validateDocumentFile,
  validateStep,
} from './onboarding.ts'
import type { ApplicationRow, DocKind, OnboardingDraft } from './onboarding.ts'

const now = new Date('2026-11-02T10:00:00Z')
const VALID_ID = '8001015009087' // a commonly published sample ID: born 1 January 1980, passes the check digit

const complete: OnboardingDraft = {
  fullName: 'Thandi Nkosi',
  idNumber: VALID_ID,
  dateOfBirth: '1980-01-01',
  phone: '082 123 4567',
  email: 'thandi@example.com',
  addressLine: '12 Jacaranda Street',
  suburb: 'Rosebank',
  city: 'Johannesburg',
  postalCode: '2196',
  licenceNumber: '1234567890AB',
  licenceCode: 'B',
  licenceIssue: '2022-03-15',
  licenceExpiry: '2027-03-14',
  vehicleReg: 'ca 123-456',
  make: 'Toyota',
  model: 'Corolla',
  year: '2019',
  vin: 'jtdkn3du0e0123456',
  engineNumber: '1nz 1234567',
  usage: 'private',
  cover: 'comprehensive',
  licenceSuspended: 'no',
  insuranceDeclined: 'no',
  claims: '0',
  consentTerms: true,
  consentProcessing: true,
  consentVerification: true,
  declarationTrue: true,
}
const allDocs: DocKind[] = ['id', 'licence', 'vehicle']
const ctx = { now, docs: allDocs }

test('a South African ID number: shape, birth date and check digit', () => {
  const ok = readIdNumber(VALID_ID, now)
  assert.deepEqual(ok, { ok: true, dob: '1980-01-01' })
  assert.deepEqual(readIdNumber('800101 5009 087', now), { ok: true, dob: '1980-01-01' })
  assert.equal(readIdNumber('', now).ok, false)
  assert.equal(readIdNumber('12345', now).ok, false)
  assert.equal(readIdNumber('800101500908X', now).ok, false)
  assert.equal(readIdNumber('8001015009088', now).ok, false) // wrong check digit
  assert.match((readIdNumber('8013015009087', now) as { error: string }).error, /birth date/) // month 13
  assert.match((readIdNumber('8002305009087', now) as { error: string }).error, /birth date/) // 30 February
})

test('the century of an ID number follows today', () => {
  // Two-digit years up to this year are 20xx; later ones are 19xx.
  assert.deepEqual(readIdNumber('0001015009085', now), { ok: true, dob: '2000-01-01' })
  assert.deepEqual(readIdNumber('3001015009082', now), { ok: true, dob: '1930-01-01' })
  assert.equal(ageOn('1980-01-01', todayIso(now)), 46)
  assert.equal(ageOn('1980-12-31', '2026-11-02'), 45)
})

test('dates are real and today is South African time', () => {
  assert.equal(isIsoDate('2026-02-29'), false)
  assert.equal(isIsoDate('2028-02-29'), true)
  assert.equal(isIsoDate('2026-1-5'), false)
  assert.equal(todayIso(new Date('2026-11-02T22:30:00Z')), '2026-11-03') // already tomorrow in Johannesburg
})

test('phone numbers are tidied to +27 form', () => {
  assert.equal(normalizePhone('082 123 4567'), '+27821234567')
  assert.equal(normalizePhone('+27 82 123 4567'), '+27821234567')
  assert.equal(normalizePhone('27821234567'), '+27821234567')
  assert.equal(normalizePhone('0821234'), null)
  assert.equal(normalizePhone('abc'), null)
  assert.equal(normalizePhone('+1 555 123 4567'), null)
})

test('step 1: a complete person passes, and each mistake is named', () => {
  assert.deepEqual(validateStep('personal', complete, ctx), {})
  const bad = validateStep('personal', { ...complete, idNumber: '8001015009088', dateOfBirth: '1981-01-01', postalCode: '21', email: 'nope' }, ctx)
  assert.ok(bad.idNumber && bad.postalCode && bad.email)
  const mismatch = validateStep('personal', { ...complete, dateOfBirth: '1981-01-01' }, ctx)
  assert.match(mismatch.dateOfBirth ?? '', /does not match/)
  const young = validateStep('personal', { ...complete, idNumber: '1001015009084', dateOfBirth: '2010-01-01' }, ctx)
  assert.ok(young.idNumber)
})

test('step 2: licence rules', () => {
  assert.deepEqual(validateStep('licence', complete, ctx), {})
  assert.match(validateStep('licence', { ...complete, licenceCode: 'A' }, ctx).licenceCode ?? '', /motorcycles/)
  assert.match(validateStep('licence', { ...complete, licenceExpiry: '2026-01-01' }, ctx).licenceExpiry ?? '', /expired/)
  assert.match(validateStep('licence', { ...complete, licenceExpiry: '2022-03-15' }, ctx).licenceExpiry ?? '', /after the issue date/)
  assert.match(validateStep('licence', { ...complete, licenceIssue: '1990-01-01' }, ctx).licenceIssue ?? '', /16th birthday/)
  assert.match(validateStep('licence', { ...complete, licenceIssue: '2030-01-01' }, ctx).licenceIssue ?? '', /future/)
  assert.ok(validateStep('licence', { ...complete, licenceNumber: '123' }, ctx).licenceNumber)
})

test('step 3: vehicle rules', () => {
  assert.deepEqual(validateStep('vehicle', complete, ctx), {})
  assert.ok(validateStep('vehicle', { ...complete, vin: 'JTDKN3DU0E012345O' }, ctx).vin) // contains the letter O
  assert.ok(validateStep('vehicle', { ...complete, vin: 'TOO SHORT' }, ctx).vin)
  assert.ok(validateStep('vehicle', { ...complete, year: '1960' }, ctx).year)
  assert.ok(validateStep('vehicle', { ...complete, year: '2040' }, ctx).year)
  assert.deepEqual(Object.keys(validateStep('vehicle', EMPTY_DRAFT, ctx)).sort(), ['engineNumber', 'make', 'model', 'usage', 'vehicleReg', 'vin', 'year'])
})

test('steps 4 to 6: cover, documents and declarations', () => {
  assert.deepEqual(validateStep('cover', complete, ctx), {})
  assert.ok(validateStep('cover', { ...complete, cover: '' }, ctx).cover)
  assert.deepEqual(validateStep('documents', complete, ctx), {})
  assert.deepEqual(Object.keys(validateStep('documents', complete, { now, docs: ['id'] })), ['doc-licence', 'doc-vehicle'])
  assert.deepEqual(validateStep('consent', complete, ctx), {})
  const missing = validateStep('consent', { ...complete, claims: '', consentVerification: false, declarationTrue: false }, ctx)
  assert.deepEqual(Object.keys(missing).sort(), ['claims', 'consentVerification', 'declarationTrue'])
  assert.deepEqual(validateStep('review', EMPTY_DRAFT, ctx), {})
})

test('the first step with a problem is found, and a complete application has none', () => {
  assert.equal(firstIncompleteStep(complete, ctx), null)
  assert.equal(firstIncompleteStep(EMPTY_DRAFT, ctx), 0)
  assert.equal(firstIncompleteStep({ ...complete, vin: '' }, ctx), 2)
  assert.equal(firstIncompleteStep(complete, { now, docs: ['id', 'licence'] }), 4)
})

test('documents: type, size and a private, never-overwritten path', () => {
  assert.equal(validateDocumentFile({ type: 'application/pdf', size: 1000 }), '')
  assert.match(validateDocumentFile({ type: 'image/gif', size: 1000 }), /JPEG, PNG or PDF/)
  assert.match(validateDocumentFile({ type: 'image/png', size: 6 * 1024 * 1024 }), /5 MB/)
  assert.match(validateDocumentFile({ type: 'image/png', size: 0 }), /empty/)
  assert.equal(validateDocumentFile({ type: 'toString', size: 10 }) !== '', true)
  assert.equal(documentPath('user-1', 'id', 'abc', 'image/jpeg'), 'user-1/id/abc.jpg')
  assert.equal(documentPath('user-1', 'vehicle', 'abc', 'application/pdf'), 'user-1/vehicle/abc.pdf')
})

test('saving: tidy values go in, half-typed values are saved as empty so saving never fails', () => {
  const fields = draftToFields(complete)
  assert.equal(fields.id_number, VALID_ID)
  assert.equal(fields.phone, '+27821234567')
  assert.equal(fields.vehicle_reg, 'CA123456')
  assert.equal(fields.vin, 'JTDKN3DU0E0123456')
  assert.equal(fields.vehicle_year, 2019)
  assert.equal(fields.licence_suspended, false)
  assert.equal(fields.claims_last_3_years, '0')

  const half = draftToFields({ ...EMPTY_DRAFT, idNumber: '8001', phone: '08', vin: 'ABC', postalCode: '21', year: '20', licenceExpiry: '2027-02-31' })
  assert.equal(half.id_number, null)
  assert.equal(half.phone, null)
  assert.equal(half.vin, null)
  assert.equal(half.postal_code, null)
  assert.equal(half.vehicle_year, null)
  assert.equal(half.licence_expiry_date, null)
  assert.equal(half.licence_suspended, null)
})

test('loading: a saved row becomes the form again, and an empty one uses the account details', () => {
  const fields = draftToFields(complete)
  const row: ApplicationRow = {
    ...fields,
    id: 'a',
    user_id: 'u',
    status: 'draft',
    step: 3,
    consented_at: null,
    submitted_at: null,
    reviewed_at: null,
    insurer_note: null,
    created_at: '2026-11-02T10:00:00Z',
    updated_at: '2026-11-02T10:00:00Z',
  }
  const back = rowToDraft(row, { fullName: 'X', email: 'x@example.com' })
  assert.equal(back.idNumber, VALID_ID)
  assert.equal(back.year, '2019')
  assert.equal(back.licenceSuspended, 'no')
  assert.equal(back.vehicleReg, 'CA123456')
  const fresh = rowToDraft(null, { fullName: 'Thandi', email: 't@example.com' })
  assert.equal(fresh.fullName, 'Thandi')
  assert.equal(fresh.email, 't@example.com')
  assert.equal(fresh.idNumber, '')
})

test('the ID is masked and only a draft or an information request can be edited', () => {
  assert.equal(maskId(VALID_ID), '•••••••••9087')
  assert.equal(maskId('123'), '')
  assert.equal(isEditable('draft'), true)
  assert.equal(isEditable('needs_info'), true)
  assert.equal(isEditable('submitted'), false)
  assert.equal(isEditable('approved'), false)
  assert.match(STATUS_TEXT.submitted.detail, /does not start your cover/)
})
