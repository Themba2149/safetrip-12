import test from 'node:test'
import assert from 'node:assert/strict'
import { AI_LAYERS, COMPARE, EARN_TABLE, FAQS, STATS, STEPS } from './landing.ts'
import { MAX_DISCOUNT_PERCENT, POINTS_PER_PERCENT, BASE_MONTHLY_PREMIUM } from './mockDriver.ts'

test('home page content is complete', () => {
  assert.equal(STEPS.length, 4)
  assert.equal(EARN_TABLE.length, 5)
  assert.equal(COMPARE.length, 4)
  assert.equal(AI_LAYERS.length, 3)
  assert.ok(STATS.every((item) => item.value && item.label))
  assert.equal(new Set(FAQS.map((item) => item.question)).size, FAQS.length)
  assert.ok(FAQS.every((item) => item.answer.length > 20))
})

test('the words on the page match the reward rules in the app', () => {
  const text = [...FAQS.map((item) => item.answer), ...STEPS.map((item) => item.text)].join(' ')
  assert.equal(POINTS_PER_PERCENT, 100)
  assert.equal(MAX_DISCOUNT_PERCENT, 15)
  assert.equal(BASE_MONTHLY_PREMIUM, 850)
  assert.match(text, /100 points/)
  assert.match(text, /15%/)
  assert.match(text, /R850/)
})