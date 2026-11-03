// Run with:  node --test src/validation.test.ts
// (needs Node 22.18 or newer; the current LTS works)
import test from 'node:test'
import assert from 'node:assert/strict'
import { validateEmail, validatePassword, validateLogin } from './validation.ts'

test('empty email asks for an email', () => {
  assert.equal(validateEmail(''), 'Enter your email address.')
  assert.equal(validateEmail('   '), 'Enter your email address.')
  assert.equal(validateEmail(undefined), 'Enter your email address.')
})

test('badly formed emails are rejected', () => {
  for (const bad of ['abc', 'abc@', '@example.com', 'a@b', 'a b@example.com', 'a@@example.com', 'a@example.c']) {
    assert.match(validateEmail(bad), /valid email/, bad)
  }
})

test('good emails pass, including surrounding spaces', () => {
  for (const good of ['themba@example.com', 'a.b+tag@mail.co.za', '  driver@safetrip.co.za  ']) {
    assert.equal(validateEmail(good), '', good)
  }
})

test('empty password is rejected, anything else passes', () => {
  assert.equal(validatePassword(''), 'Enter your password.')
  assert.equal(validatePassword(undefined), 'Enter your password.')
  assert.equal(validatePassword('x'), '')
  assert.equal(validatePassword('   '), '') // spaces are a legal password character
})

test('validateLogin reports each field separately', () => {
  assert.deepEqual(validateLogin({ email: '', password: '' }), {
    email: 'Enter your email address.',
    password: 'Enter your password.',
  })
  assert.deepEqual(validateLogin({ email: 'a@b.co', password: 'secret' }), { email: '', password: '' })
})
