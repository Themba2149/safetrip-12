import test from 'node:test'
import assert from 'node:assert/strict'
import { isDecision, summarizeChecks } from './checks.ts'
import type { CheckRow } from './checks.ts'

const now = new Date('2026-11-01T12:00:00Z')
const daysAgo = (days: number): string => new Date(now.getTime() - days * 86_400_000).toISOString()
const row = (action: CheckRow['action'], followed: boolean, days: number, risk = 40): CheckRow => ({
  id: `${action}-${days}-${followed}`,
  scenario: 'rain',
  departure: 'now',
  action,
  risk_score: risk,
  followed,
  created_at: daysAgo(days),
})

test('no checks means no score, not a made-up one', () => {
  const summary = summarizeChecks([], now)
  assert.equal(summary.score, null)
  assert.equal(summary.averageRisk, null)
  assert.equal(summary.total, 0)
  assert.equal(summary.weeks.length, 6)
  assert.ok(summary.weeks.every((week) => week.score === null))
})

test('travelling on a clear day is not a decision', () => {
  assert.equal(isDecision('travel-now'), false)
  assert.equal(isDecision('wait'), true)
  const summary = summarizeChecks([row('travel-now', false, 1, 0)], now)
  assert.equal(summary.total, 1)
  assert.equal(summary.score, null)
})

test('the score is the share of safer choices followed', () => {
  const summary = summarizeChecks(
    [row('wait', true, 1, 50), row('avoid', false, 2, 70), row('reroute', true, 3, 30), row('travel-now', false, 1, 0)],
    now,
  )
  assert.equal(summary.decisions, 3)
  assert.equal(summary.followed, 2)
  assert.equal(summary.score, 67)
  assert.equal(summary.averageRisk, 38)
})

test('weeks are bucketed, oldest first, and old checks are left out of the bars', () => {
  const summary = summarizeChecks(
    [row('wait', true, 1), row('wait', false, 2), row('wait', true, 9), row('wait', true, 100)],
    now,
  )
  assert.equal(summary.weeks[5].score, 50) // this week: 1 of 2
  assert.equal(summary.weeks[4].score, 100) // last week
  assert.equal(summary.weeks[0].score, null)
  assert.equal(summary.decisions, 4) // the overall score still counts every saved check
})

test('bad dates are ignored in the weekly bars', () => {
  const bad = { ...row('wait', true, 1), created_at: 'nope' }
  const summary = summarizeChecks([bad], now)
  assert.ok(summary.weeks.every((week) => week.score === null))
})