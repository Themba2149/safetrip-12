import test from 'node:test'
import assert from 'node:assert/strict'
import {
  emptyProfile,
  fromRow,
  hasErrors,
  hasInsurance,
  isProfileComplete,
  toRow,
  validateProfile,
  vehicleSummary,
} from './profile.ts'
import type { Profile } from './profile.ts'

const good: Profile = {
  ...emptyProfile('Sandile Zulu'),
  phone: '082 123 4567',
  city: 'Johannesburg',
  vehicleMake: 'Toyota',
  vehicleModel: 'Corolla',
  vehicleYear: '2019',
  vehicleReg: 'ca 123-456',
}

test('an empty profile has errors and is not set up', () => {
  const errors = validateProfile(emptyProfile(), 2026)
  assert.equal(hasErrors(errors), true)
  assert.equal(isProfileComplete(emptyProfile(), 2026), false)
})

test('a filled-in driver and car is complete, with no insurance needed', () => {
  assert.equal(hasErrors(validateProfile(good, 2026)), false)
  assert.equal(isProfileComplete(good, 2026), true)
  assert.equal(hasInsurance(good), false)
})

test('phone numbers, years and registrations are checked', () => {
  assert.match(validateProfile({ ...good, phone: '12345' }, 2026).phone, /South African/)
  assert.equal(validateProfile({ ...good, phone: '+27821234567' }, 2026).phone, '')
  assert.match(validateProfile({ ...good, vehicleYear: '1950' }, 2026).vehicleYear, /between/)
  assert.match(validateProfile({ ...good, vehicleYear: 'abc' }, 2026).vehicleYear, /between/)
  assert.equal(validateProfile({ ...good, vehicleYear: '2027' }, 2026).vehicleYear, '')
  assert.match(validateProfile({ ...good, vehicleReg: '!!' }, 2026).vehicleReg, /letters/)
})

test('naming an insurer needs a policy number and a cover type', () => {
  const withInsurer: Profile = { ...good, insurer: 'Outsurance' }
  const errors = validateProfile(withInsurer, 2026)
  assert.match(errors.policyNumber, /policy number/)
  assert.match(errors.coverType, /cover/)
  const filled = validateProfile({ ...withInsurer, policyNumber: 'POL-12345', coverType: 'comprehensive' }, 2026)
  assert.equal(hasErrors(filled), false)
})

test('sharing with an insurer needs an insurer', () => {
  assert.match(validateProfile({ ...good, shareWithInsurer: true }, 2026).insurer, /insurer/)
})

test('saving cleans the data and keeps the original consent time', () => {
  const profile: Profile = {
    ...good,
    insurer: ' Outsurance ',
    policyNumber: ' POL-12345 ',
    coverType: 'comprehensive',
    shareWithInsurer: true,
    consentAt: '2026-10-01T08:00:00.000Z',
  }
  const row = toRow(profile, 'user-1', 'a@b.co', '2026-10-31T09:00:00.000Z')
  assert.equal(row.phone, '0821234567')
  assert.equal(row.vehicle_reg, 'CA 123-456')
  assert.equal(row.vehicle_year, 2019)
  assert.equal(row.insurer, 'Outsurance')
  assert.equal(row.consent_at, '2026-10-01T08:00:00.000Z')
})

test('first-time sharing stamps the consent time, and turning it off clears it', () => {
  const on = toRow({ ...good, insurer: 'Santam', policyNumber: 'POL-9999', coverType: 'third-party', shareWithInsurer: true }, 'u', '', '2026-10-31T09:00:00.000Z')
  assert.equal(on.consent_at, '2026-10-31T09:00:00.000Z')
  const off = toRow({ ...good, shareWithInsurer: false, consentAt: 'x' }, 'u', '', '2026-10-31T09:00:00.000Z')
  assert.equal(off.consent_at, null)
})

test('no insurer means no policy details are saved', () => {
  const row = toRow({ ...good, insurer: '', policyNumber: 'LEFTOVER1', coverType: 'comprehensive' }, 'u', '', 'now')
  assert.equal(row.insurer, null)
  assert.equal(row.policy_number, null)
  assert.equal(row.cover_type, null)
})

test('a row loads back into the same profile, and a missing row uses the fallback name', () => {
  const row = toRow({ ...good, insurer: 'Hollard', policyNumber: 'POL-5555', coverType: 'comprehensive' }, 'u', 'a@b.co', 'now')
  const back = fromRow(row)
  assert.equal(back.vehicleYear, '2019')
  assert.equal(back.insurer, 'Hollard')
  assert.equal(fromRow(null, 'Thandi').fullName, 'Thandi')
})

test('the vehicle summary reads well', () => {
  assert.equal(vehicleSummary(good), '2019 Toyota Corolla · CA 123-456')
})