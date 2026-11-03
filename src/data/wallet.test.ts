import test from 'node:test'
import assert from 'node:assert/strict'
import { SAMPLE_OPENING_BALANCE, balanceOf, makeEntry, progressToCap, progressToNext, sampleLedger } from './wallet.ts'
import { sampleWalletPoints } from './mockDriver.ts'

test('the sample ledger adds up to the sample balance', () => {
  assert.equal(balanceOf(SAMPLE_OPENING_BALANCE, sampleLedger), sampleWalletPoints)
})

test('earning adds to the balance', () => {
  const entries = [makeEntry('Took a safer route', 15, 1), ...sampleLedger]
  assert.equal(balanceOf(SAMPLE_OPENING_BALANCE, entries), sampleWalletPoints + 15)
})

test('progress to the next 1 percent', () => {
  assert.equal(progressToNext(1240), 40)
  assert.equal(progressToNext(0), 0)
  assert.equal(progressToNext(1500), null)
})

test('progress to the cap stays between 0 and 100', () => {
  assert.equal(progressToCap(0), 0)
  assert.equal(progressToCap(750), 50)
  assert.equal(progressToCap(1500), 100)
  assert.equal(progressToCap(99999), 100)
  assert.equal(progressToCap(-10), 0)
})