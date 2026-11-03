import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ENROLLED_DRIVERS,
  alertStats,
  claimsSaving,
  discountTiers,
  estimatedClaimsAvoided,
  followRate,
  highRiskTripsAvoided,
  monthlyDiscountCost,
  monthlyPremiumBook,
  riskBands,
  totalDrivers,
} from './portfolio.ts'

test('the sample groups all add up to the enrolled drivers', () => {
  assert.equal(totalDrivers(riskBands), ENROLLED_DRIVERS)
  assert.equal(totalDrivers(discountTiers), ENROLLED_DRIVERS)
})

test('follow rate is a percentage between 0 and 100', () => {
  assert.equal(followRate(0, 0), 0)
  assert.equal(followRate(200, 100), 50)
  assert.equal(followRate(100, 150), 100)
  assert.equal(followRate(100, -5), 0)
  for (const stat of alertStats) {
    assert.ok(stat.followed <= stat.sent)
  }
})

test('claims avoided and the saving', () => {
  assert.equal(estimatedClaimsAvoided(0), 0)
  assert.equal(estimatedClaimsAvoided(-10), 0)
  assert.equal(estimatedClaimsAvoided(5000), 10)
  assert.equal(claimsSaving(10), 250000)
  assert.equal(claimsSaving(-3), 0)
})

test('only dangerous alerts count as high-risk trips avoided', () => {
  assert.equal(highRiskTripsAvoided(alertStats), 2730 + 512 + 1330)
})

test('discounts cost something but stay below the whole premium book', () => {
  const cost = monthlyDiscountCost(discountTiers)
  assert.ok(cost > 0)
  assert.ok(cost < monthlyPremiumBook(ENROLLED_DRIVERS))
  assert.equal(monthlyDiscountCost([]), 0)
})