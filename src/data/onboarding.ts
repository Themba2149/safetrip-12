// Driver onboarding: the seven steps, the checks on every field, and the mapping to the database row.
// Pure functions with no React or network code, so they are easy to test.
// Honest scope: these checks catch typing mistakes. They do NOT prove who someone is. The insurer verifies and decides.
import { normalizeRegistration } from './lookup.ts'

export type StepKey = 'personal' | 'licence' | 'vehicle' | 'cover' | 'documents' | 'consent' | 'review'

export const STEPS: { key: StepKey; label: string }[] = [
  { key: 'personal', label: 'About you' },
  { key: 'licence', label: 'Licence' },
  { key: 'vehicle', label: 'Vehicle' },
  { key: 'cover', label: 'Cover' },
  { key: 'documents', label: 'Documents' },
  { key: 'consent', label: 'Declarations' },
  { key: 'review', label: 'Review' },
]

export type DocKind = 'id' | 'licence' | 'vehicle'
export const DOC_KINDS: { kind: DocKind; label: string; hint: string }[] = [
  { kind: 'id', label: 'ID document', hint: 'Your smart ID card (front and back on one page) or the photo page of your ID book' },
  { kind: 'licence', label: 'Driving licence', hint: 'The front and back of your licence card' },
  { kind: 'vehicle', label: 'Vehicle registration', hint: 'The vehicle registration certificate' },
]

export const LICENCE_CODES = ['A1', 'A', 'B', 'C1', 'C', 'EB', 'EC1', 'EC'] as const
const CAR_CODES: readonly string[] = ['B', 'EB', 'C1', 'C', 'EC1', 'EC']

export type CoverType = 'comprehensive' | 'third_party_fire_theft' | 'third_party'
export const COVER_OPTIONS: { value: CoverType; label: string; covers: string }[] = [
  {
    value: 'comprehensive',
    label: 'Comprehensive',
    covers: 'Damage to your car from accidents, theft, fire and weather such as hail, plus damage you cause to other people\'s property.',
  },
  {
    value: 'third_party_fire_theft',
    label: 'Third party, fire and theft',
    covers: 'Damage you cause to other people\'s property, plus your own car if it is stolen or burnt. Accident damage to your own car is not covered.',
  },
  {
    value: 'third_party',
    label: 'Third party only',
    covers: 'Damage you cause to other people\'s property. Your own car is not covered.',
  },
]

export type VehicleUsage = 'private' | 'private_business' | 'business' | 'ehailing'
export const USAGE_OPTIONS: { value: VehicleUsage; label: string }[] = [
  { value: 'private', label: 'Private use only' },
  { value: 'private_business', label: 'Private and some business use' },
  { value: 'business', label: 'Business use' },
  { value: 'ehailing', label: 'E-hailing or ride sharing' },
]

export type YesNo = 'yes' | 'no' | ''
export type ClaimsCount = '0' | '1' | '2' | '3+' | ''
const CLAIM_VALUES = ['0', '1', '2', '3+']

export type OnboardingDraft = {
  fullName: string
  idNumber: string
  dateOfBirth: string // YYYY-MM-DD
  phone: string
  email: string
  addressLine: string
  suburb: string
  city: string
  postalCode: string
  licenceNumber: string
  licenceCode: string
  licenceIssue: string
  licenceExpiry: string
  vehicleReg: string
  make: string
  model: string
  year: string
  vin: string
  engineNumber: string
  usage: VehicleUsage | ''
  cover: CoverType | ''
  licenceSuspended: YesNo
  insuranceDeclined: YesNo
  claims: ClaimsCount
  consentTerms: boolean
  consentProcessing: boolean
  consentVerification: boolean
  declarationTrue: boolean
}

export const EMPTY_DRAFT: OnboardingDraft = {
  fullName: '',
  idNumber: '',
  dateOfBirth: '',
  phone: '',
  email: '',
  addressLine: '',
  suburb: '',
  city: '',
  postalCode: '',
  licenceNumber: '',
  licenceCode: '',
  licenceIssue: '',
  licenceExpiry: '',
  vehicleReg: '',
  make: '',
  model: '',
  year: '',
  vin: '',
  engineNumber: '',
  usage: '',
  cover: '',
  licenceSuspended: '',
  insuranceDeclined: '',
  claims: '',
  consentTerms: false,
  consentProcessing: false,
  consentVerification: false,
  declarationTrue: false,
}

export type Errors = Record<string, string>
export type StepContext = { now: Date; docs: DocKind[] }

// ---------- Dates (South Africa time, UTC+2, no daylight saving) ----------

export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

/** Today's date in South Africa as YYYY-MM-DD. */
export function todayIso(now: Date): string {
  return new Date(now.getTime() + 2 * 3_600_000).toISOString().slice(0, 10)
}

/** Whole years between a birth date and a day. */
export function ageOn(dob: string, day: string): number {
  const [by, bm, bd] = dob.split('-').map(Number)
  const [ty, tm, td] = day.split('-').map(Number)
  return ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0)
}

// ---------- South African ID number ----------

function luhnValid(digits: string): boolean {
  let sum = 0
  for (let i = 0; i < digits.length; i++) {
    let digit = Number(digits[digits.length - 1 - i])
    if (i % 2 === 1) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    sum += digit
  }
  return sum % 10 === 0
}

export type IdReading = { ok: true; dob: string } | { ok: false; error: string }

/**
 * Checks the shape of a 13-digit South African ID number: a real birth date, a valid citizenship digit and the check digit.
 * This catches typing mistakes only. It cannot tell whether the number belongs to this person.
 */
export function readIdNumber(text: string, now: Date): IdReading {
  const id = text.replace(/\s/g, '')
  if (id === '') return { ok: false, error: 'Enter your 13-digit ID number.' }
  if (!/^\d{13}$/.test(id)) return { ok: false, error: 'Your ID number must be 13 digits.' }

  const yy = Number(id.slice(0, 2))
  const month = Number(id.slice(2, 4))
  const day = Number(id.slice(4, 6))
  const year = 2000 + yy <= now.getUTCFullYear() ? 2000 + yy : 1900 + yy
  const dob = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  if (!isIsoDate(dob)) return { ok: false, error: 'The first six digits of an ID number are a birth date, and these are not a real date.' }
  if (id[10] !== '0' && id[10] !== '1') return { ok: false, error: 'That ID number is not valid. Check each digit.' }
  if (!luhnValid(id)) return { ok: false, error: 'That ID number is not valid. Check each digit.' }
  return { ok: true, dob }
}

/** Shows only the last four digits, for the review screen. */
export function maskId(text: string): string {
  const id = text.replace(/\s/g, '')
  return id.length === 13 ? `${'•'.repeat(9)}${id.slice(-4)}` : ''
}

// ---------- Other field rules ----------

/** "082 123 4567", "+27 82 123 4567" and "0821234567" all become "+27821234567". */
export function normalizePhone(text: string): string | null {
  const compact = text.replace(/[\s\-()]/g, '')
  let rest = ''
  if (compact.startsWith('+27')) rest = compact.slice(3)
  else if (compact.startsWith('27') && compact.length === 11) rest = compact.slice(2)
  else if (compact.startsWith('0') && compact.length === 10) rest = compact.slice(1)
  return /^[1-9]\d{8}$/.test(rest) ? `+27${rest}` : null
}

function validEmail(text: string): boolean {
  const value = text.trim()
  return value.length <= 120 && /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(value)
}

function between(text: string, min: number, max: number): boolean {
  const length = text.trim().length
  return length >= min && length <= max
}

export function cleanVin(text: string): string {
  return text.replace(/\s/g, '').toUpperCase()
}

export function cleanEngine(text: string): string {
  return text.trim().toUpperCase().replace(/\s+/g, ' ')
}

export function cleanLicenceNumber(text: string): string {
  return text.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

// ---------- Step checks ----------

function personalErrors(draft: OnboardingDraft, now: Date): Errors {
  const errors: Errors = {}
  const name = draft.fullName.trim()
  if (!between(name, 2, 100) || !/^[\p{L}][\p{L} .'’-]*$/u.test(name)) errors.fullName = 'Enter your full name as it appears on your ID.'

  const id = readIdNumber(draft.idNumber, now)
  if (!id.ok) errors.idNumber = id.error
  else {
    const age = ageOn(id.dob, todayIso(now))
    if (age < 18) errors.idNumber = 'You must be 18 or older to apply.'
    else if (age > 100) errors.idNumber = 'Please check your ID number.'
  }

  if (!isIsoDate(draft.dateOfBirth)) errors.dateOfBirth = 'Enter your date of birth.'
  else if (id.ok && id.dob !== draft.dateOfBirth) errors.dateOfBirth = 'This does not match the birth date in your ID number.'

  if (normalizePhone(draft.phone) === null) errors.phone = 'Enter a South African cellphone number, like 082 123 4567.'
  if (!validEmail(draft.email)) errors.email = 'Enter a valid email address.'
  if (!between(draft.addressLine, 5, 120)) errors.addressLine = 'Enter your street address.'
  if (!between(draft.suburb, 2, 60)) errors.suburb = 'Enter your suburb.'
  if (!between(draft.city, 2, 60)) errors.city = 'Enter your city or town.'
  if (!/^\d{4}$/.test(draft.postalCode.trim())) errors.postalCode = 'Enter a 4-digit postal code.'
  return errors
}

function licenceErrors(draft: OnboardingDraft, now: Date): Errors {
  const errors: Errors = {}
  const today = todayIso(now)
  const number = cleanLicenceNumber(draft.licenceNumber)
  if (number.length < 8 || number.length > 20) errors.licenceNumber = 'Enter the licence number from your card (8 to 20 letters and numbers).'

  if (!(LICENCE_CODES as readonly string[]).includes(draft.licenceCode)) errors.licenceCode = 'Choose your licence code.'
  else if (!CAR_CODES.includes(draft.licenceCode)) errors.licenceCode = 'That code is for motorcycles. A car needs code B, EB, C1, C, EC1 or EC.'

  if (!isIsoDate(draft.licenceIssue)) errors.licenceIssue = 'Enter the issue date on your licence.'
  else if (draft.licenceIssue > today) errors.licenceIssue = 'The issue date cannot be in the future.'
  else if (isIsoDate(draft.dateOfBirth) && ageOn(draft.dateOfBirth, draft.licenceIssue) < 16) {
    errors.licenceIssue = 'This issue date is before your 16th birthday. Check it.'
  }

  if (!isIsoDate(draft.licenceExpiry)) errors.licenceExpiry = 'Enter the expiry date on your licence.'
  else if (isIsoDate(draft.licenceIssue) && draft.licenceExpiry <= draft.licenceIssue) errors.licenceExpiry = 'The expiry date must be after the issue date.'
  else if (draft.licenceExpiry < today) errors.licenceExpiry = 'Your licence has expired. You need a valid licence to apply.'
  return errors
}

function vehicleErrors(draft: OnboardingDraft, now: Date): Errors {
  const errors: Errors = {}
  const reg = normalizeRegistration(draft.vehicleReg)
  if (!/^[A-Za-z0-9 -]+$/.test(draft.vehicleReg.trim()) || reg.length < 3 || reg.length > 12) {
    errors.vehicleReg = 'Enter the registration number (3 to 12 letters and numbers).'
  }
  if (!between(draft.make, 2, 40)) errors.make = 'Enter the make, like Toyota.'
  if (!between(draft.model, 1, 40)) errors.model = 'Enter the model, like Corolla.'
  const year = Number(draft.year)
  if (!/^\d{4}$/.test(draft.year.trim()) || year < 1980 || year > now.getUTCFullYear() + 1) errors.year = `Enter a year from 1980 to ${now.getUTCFullYear() + 1}.`
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(cleanVin(draft.vin))) errors.vin = 'A VIN has 17 letters and numbers, and never uses I, O or Q.'
  if (!/^[A-Z0-9][A-Z0-9 -]{2,24}$/.test(cleanEngine(draft.engineNumber))) errors.engineNumber = 'Enter the engine number (3 to 25 letters and numbers).'
  if (!USAGE_OPTIONS.some((option) => option.value === draft.usage)) errors.usage = 'Choose how the vehicle is used.'
  return errors
}

function coverErrors(draft: OnboardingDraft): Errors {
  return COVER_OPTIONS.some((option) => option.value === draft.cover) ? {} : { cover: 'Choose the cover you would like.' }
}

function documentErrors(ctx: StepContext): Errors {
  const errors: Errors = {}
  for (const doc of DOC_KINDS) if (!ctx.docs.includes(doc.kind)) errors[`doc-${doc.kind}`] = `Upload your ${doc.label.toLowerCase()}.`
  return errors
}

function consentErrors(draft: OnboardingDraft): Errors {
  const errors: Errors = {}
  if (draft.licenceSuspended === '') errors.licenceSuspended = 'Answer this question.'
  if (draft.insuranceDeclined === '') errors.insuranceDeclined = 'Answer this question.'
  if (!CLAIM_VALUES.includes(draft.claims)) errors.claims = 'Choose a number.'
  if (!draft.consentTerms) errors.consentTerms = 'Please read and accept the terms to continue.'
  if (!draft.consentProcessing) errors.consentProcessing = 'We need your permission to process your information.'
  if (!draft.consentVerification) errors.consentVerification = 'The insurer needs your permission to verify your details.'
  if (!draft.declarationTrue) errors.declarationTrue = 'Please confirm that your answers are true.'
  return errors
}

export function validateStep(step: StepKey, draft: OnboardingDraft, ctx: StepContext): Errors {
  switch (step) {
    case 'personal':
      return personalErrors(draft, ctx.now)
    case 'licence':
      return licenceErrors(draft, ctx.now)
    case 'vehicle':
      return vehicleErrors(draft, ctx.now)
    case 'cover':
      return coverErrors(draft)
    case 'documents':
      return documentErrors(ctx)
    case 'consent':
      return consentErrors(draft)
    case 'review':
      return {}
  }
}

/** The first step (by number, starting at 0) that still has a problem, or null when everything is complete. */
export function firstIncompleteStep(draft: OnboardingDraft, ctx: StepContext): number | null {
  const index = STEPS.findIndex((step) => Object.keys(validateStep(step.key, draft, ctx)).length > 0)
  return index === -1 ? null : index
}

export function hasErrors(errors: Errors): boolean {
  return Object.keys(errors).length > 0
}

// ---------- Documents ----------

export const MAX_DOC_BYTES = 5 * 1024 * 1024
const DOC_TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'application/pdf': 'pdf' }

/** An error message, or an empty string when the file can be uploaded. The storage bucket enforces the same limits. */
export function validateDocumentFile(file: { type: string; size: number }): string {
  if (!Object.hasOwn(DOC_TYPES, file.type)) return 'Upload a JPEG, PNG or PDF file.'
  if (file.size <= 0) return 'That file is empty.'
  if (file.size > MAX_DOC_BYTES) return 'That file is larger than 5 MB. Try a smaller photo or scan.'
  return ''
}

/** Every file goes in its owner's own folder and gets a fresh name, so one upload can never overwrite another. */
export function documentPath(userId: string, kind: DocKind, fileId: string, mime: string): string {
  return `${userId}/${kind}/${fileId}.${DOC_TYPES[mime] ?? 'bin'}`
}

// ---------- Application status ----------

export type ApplicationStatus = 'draft' | 'submitted' | 'in_review' | 'needs_info' | 'approved' | 'declined'

export function isEditable(status: ApplicationStatus): boolean {
  return status === 'draft' || status === 'needs_info'
}

export const STATUS_TEXT: Record<ApplicationStatus, { label: string; detail: string }> = {
  draft: { label: 'Not submitted', detail: 'Finish the steps and submit when you are ready.' },
  submitted: { label: 'Submitted', detail: 'The insurer will verify your details and decide on cover. Submitting does not start your cover.' },
  in_review: { label: 'In review', detail: 'The insurer is checking your details. This can take a few working days.' },
  needs_info: { label: 'More information needed', detail: 'The insurer needs something from you. Read their note, update your application and submit again.' },
  approved: { label: 'Approved', detail: 'The insurer approved your application. They will confirm your cover and policy number.' },
  declined: { label: 'Not approved', detail: 'The insurer could not offer cover on this application. Contact them for the reason.' },
}

// ---------- Database row ----------

export type ApplicationRow = {
  id: string
  user_id: string
  status: ApplicationStatus
  step: number
  full_name: string | null
  id_number: string | null
  date_of_birth: string | null
  phone: string | null
  email: string | null
  address_line: string | null
  suburb: string | null
  city: string | null
  postal_code: string | null
  licence_number: string | null
  licence_code: string | null
  licence_issue_date: string | null
  licence_expiry_date: string | null
  vehicle_reg: string | null
  vehicle_make: string | null
  vehicle_model: string | null
  vehicle_year: number | null
  vin: string | null
  engine_number: string | null
  vehicle_usage: string | null
  cover_type: string | null
  licence_suspended: boolean | null
  insurance_declined: boolean | null
  claims_last_3_years: string | null
  consent_terms: boolean
  consent_processing: boolean
  consent_verification: boolean
  declaration_true: boolean
  consented_at: string | null
  submitted_at: string | null
  reviewed_at: string | null
  insurer_note: string | null
  created_at: string
  updated_at: string
}

export type SavedFields = Omit<
  ApplicationRow,
  'id' | 'user_id' | 'status' | 'step' | 'consented_at' | 'submitted_at' | 'reviewed_at' | 'insurer_note' | 'created_at' | 'updated_at'
>

function text(value: string, max: number): string | null {
  const trimmed = value.trim().slice(0, max)
  return trimmed === '' ? null : trimmed
}

function isoOrNull(value: string): string | null {
  return isIsoDate(value) ? value : null
}

function yesNo(value: YesNo): boolean | null {
  return value === 'yes' ? true : value === 'no' ? false : null
}

/**
 * What to save. Anything half-typed that the database would refuse is saved as empty instead, so
 * "Save and finish later" never fails. The Next button checks everything properly before a step is passed.
 */
export function draftToFields(draft: OnboardingDraft): SavedFields {
  const idDigits = draft.idNumber.replace(/\s/g, '')
  const year = Number(draft.year)
  const vin = cleanVin(draft.vin)
  return {
    full_name: text(draft.fullName, 100),
    id_number: /^\d{13}$/.test(idDigits) ? idDigits : null,
    date_of_birth: isoOrNull(draft.dateOfBirth),
    phone: normalizePhone(draft.phone),
    email: text(draft.email, 120),
    address_line: text(draft.addressLine, 120),
    suburb: text(draft.suburb, 60),
    city: text(draft.city, 60),
    postal_code: /^\d{4}$/.test(draft.postalCode.trim()) ? draft.postalCode.trim() : null,
    licence_number: text(cleanLicenceNumber(draft.licenceNumber), 20),
    licence_code: (LICENCE_CODES as readonly string[]).includes(draft.licenceCode) ? draft.licenceCode : null,
    licence_issue_date: isoOrNull(draft.licenceIssue),
    licence_expiry_date: isoOrNull(draft.licenceExpiry),
    vehicle_reg: text(normalizeRegistration(draft.vehicleReg), 12),
    vehicle_make: text(draft.make, 40),
    vehicle_model: text(draft.model, 40),
    vehicle_year: Number.isInteger(year) && year >= 1980 && year <= 2100 ? year : null,
    vin: /^[A-HJ-NPR-Z0-9]{17}$/.test(vin) ? vin : null,
    engine_number: text(cleanEngine(draft.engineNumber), 25),
    vehicle_usage: USAGE_OPTIONS.some((option) => option.value === draft.usage) ? draft.usage : null,
    cover_type: COVER_OPTIONS.some((option) => option.value === draft.cover) ? draft.cover : null,
    licence_suspended: yesNo(draft.licenceSuspended),
    insurance_declined: yesNo(draft.insuranceDeclined),
    claims_last_3_years: CLAIM_VALUES.includes(draft.claims) ? draft.claims : null,
    consent_terms: draft.consentTerms,
    consent_processing: draft.consentProcessing,
    consent_verification: draft.consentVerification,
    declaration_true: draft.declarationTrue,
  }
}

function fromBool(value: boolean | null): YesNo {
  return value === true ? 'yes' : value === false ? 'no' : ''
}

/** Builds the form from a saved row. Empty fields fall back to what we already know from the account. */
export function rowToDraft(row: ApplicationRow | null, fallback: { fullName: string; email: string }): OnboardingDraft {
  if (!row) return { ...EMPTY_DRAFT, fullName: fallback.fullName, email: fallback.email }
  return {
    fullName: row.full_name ?? fallback.fullName,
    idNumber: row.id_number ?? '',
    dateOfBirth: row.date_of_birth ?? '',
    phone: row.phone ?? '',
    email: row.email ?? fallback.email,
    addressLine: row.address_line ?? '',
    suburb: row.suburb ?? '',
    city: row.city ?? '',
    postalCode: row.postal_code ?? '',
    licenceNumber: row.licence_number ?? '',
    licenceCode: row.licence_code ?? '',
    licenceIssue: row.licence_issue_date ?? '',
    licenceExpiry: row.licence_expiry_date ?? '',
    vehicleReg: row.vehicle_reg ?? '',
    make: row.vehicle_make ?? '',
    model: row.vehicle_model ?? '',
    year: row.vehicle_year === null ? '' : String(row.vehicle_year),
    vin: row.vin ?? '',
    engineNumber: row.engine_number ?? '',
    usage: USAGE_OPTIONS.find((option) => option.value === row.vehicle_usage)?.value ?? '',
    cover: COVER_OPTIONS.find((option) => option.value === row.cover_type)?.value ?? '',
    licenceSuspended: fromBool(row.licence_suspended),
    insuranceDeclined: fromBool(row.insurance_declined),
    claims: CLAIM_VALUES.includes(row.claims_last_3_years ?? '') ? (row.claims_last_3_years as ClaimsCount) : '',
    consentTerms: row.consent_terms,
    consentProcessing: row.consent_processing,
    consentVerification: row.consent_verification,
    declarationTrue: row.declaration_true,
  }
}
