import test from 'node:test'
import assert from 'node:assert/strict'
import { isInsurer } from './roles.ts'

test('only the insurer role is allowed', () => {
  assert.equal(isInsurer({ role: 'insurer' }), true)
  assert.equal(isInsurer({ role: 'driver' }), false)
  assert.equal(isInsurer({ role: 'INSURER' }), false)
  assert.equal(isInsurer({ provider: 'email' }), false)
})

test('missing or odd metadata is never an insurer', () => {
  assert.equal(isInsurer(undefined), false)
  assert.equal(isInsurer(null), false)
  assert.equal(isInsurer('insurer'), false)
  assert.equal(isInsurer({ role: ['insurer'] }), false)
})