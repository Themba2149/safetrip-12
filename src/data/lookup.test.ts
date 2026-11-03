import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeRegistration, validateRegistrationSearch } from './lookup.ts'

test('registrations are cleaned the same way every time', () => {
  assert.equal(normalizeRegistration('ca 123-456'), 'CA123456')
  assert.equal(normalizeRegistration(' ABC 123 GP '), 'ABC123GP')
  assert.equal(normalizeRegistration('--'), '')
})

test('a registration must be filled in and sensible before searching', () => {
  assert.match(validateRegistrationSearch('   '), /Enter the vehicle registration/)
  assert.match(validateRegistrationSearch('AB'), /valid registration/)
  assert.match(validateRegistrationSearch('ABCDEFGHIJKLM'), /valid registration/)
  assert.match(validateRegistrationSearch('AB*123'), /letters, numbers/)
  assert.equal(validateRegistrationSearch('CA 123-456'), '')
  assert.equal(validateRegistrationSearch('abc123gp'), '')
})