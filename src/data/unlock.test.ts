import test from 'node:test'
import assert from 'node:assert/strict'
import { fromBase64Url, toBase64Url, unlockStorageKey } from './unlock.ts'

test('bytes survive a round trip through base64url', () => {
  const bytes = new Uint8Array([0, 1, 2, 250, 251, 252, 253, 254, 255, 62, 63])
  const text = toBase64Url(bytes)
  assert.doesNotMatch(text, /[+/=]/)
  assert.deepEqual(Array.from(fromBase64Url(text)), Array.from(bytes))
  assert.equal(toBase64Url(new Uint8Array([])), '')
})

test('each driver gets their own storage key', () => {
  assert.notEqual(unlockStorageKey('a'), unlockStorageKey('b'))
  assert.match(unlockStorageKey('abc'), /abc$/)
})