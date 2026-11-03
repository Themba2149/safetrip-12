import test from 'node:test'
import assert from 'node:assert/strict'
import {
  BASE_MONTHLY_PREMIUM,
  MAX_DISCOUNT_PERCENT,
  averageScore,
  discountPercent,
  discountedPremium,
  pointsToNextPercent,
  scoreBand,
} from './mockDriver.ts'

test('no points means no discount, never a surcharge', () => {
  assert.equal(discountPercent(0), 0)
  assert.equal(discountPercent(99), 0)
  assert.equal(discountPercent(-50), 0)
})

test('100 points is 1% off and the discount is capped at 15%', () => {
  assert.equal(discountPercent(100), 1)
  assert.equal(discountPercent(1240), 12)
  assert.equal(discountPercent(1500), MAX_DISCOUNT_PERCENT)
  assert.equal(discountPercent(9999), MAX_DISCOUNT_PERCENT)
})

test('the premium is never above the base premium', () => {
  for (let points = -50; points <= 3000; points += 10) {
    assert.ok(discountedPremium(points) <= BASE_MONTHLY_PREMIUM)
  }
})

test('points to the next 1%', () => {
  assert.equal(pointsToNextPercent(1240), 60)
  assert.equal(pointsToNextPercent(0), 100)
  assert.equal(pointsToNextPercent(1500), null)
})

test('score bands', () => {
  assert.equal(scoreBand(80).tone, 'good')
  assert.equal(scoreBand(79).tone, 'ok')
  assert.equal(scoreBand(60).tone, 'ok')
  assert.equal(scoreBand(59).tone, 'low')
})

test('average score handles an empty list', () => {
  assert.equal(averageScore([]), 0)
})