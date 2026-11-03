import test from 'node:test'
import assert from 'node:assert/strict'
import { balanceOf, entryFromRow, formatWhen } from './wallet.ts'

const now = new Date(2026, 9, 31, 14, 0, 0) // 31 Oct 2026, 14:00 local time

test('recent times read naturally', () => {
  assert.equal(formatWhen(new Date(2026, 9, 31, 13, 59, 30).toISOString(), now), 'Just now')
  assert.equal(formatWhen(new Date(2026, 9, 31, 9, 0, 0).toISOString(), now), 'Today')
  assert.equal(formatWhen(new Date(2026, 9, 30, 20, 0, 0).toISOString(), now), 'Yesterday')
})

test('older times show a date, and a bad date shows nothing', () => {
  assert.match(formatWhen(new Date(2026, 9, 10, 9, 0, 0).toISOString(), now), /\d/)
  assert.equal(formatWhen('not a date', now), '')
})

test('a saved reward becomes a history line and counts towards the balance', () => {
  const entry = entryFromRow(
    { id: 'e1', reason: 'Took a safer route', points: 15, created_at: new Date(2026, 9, 31, 13, 59, 50).toISOString() },
    now,
  )
  assert.equal(entry.when, 'Just now')
  assert.equal(balanceOf(0, [entry]), 15)
})