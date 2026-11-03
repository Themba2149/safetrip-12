import test from 'node:test'
import assert from 'node:assert/strict'
import { assess } from './advisor.ts'
import type { Scenario, TripInput } from './advisor.ts'

// The database function claim_advice repeats these numbers (wait 10, reroute 15, avoid 20, long-trip break 15).
// If a rule changes here, the SQL must change with it. This test is the reminder.
const trip = (scenario: Scenario, longTrip: boolean): TripInput => ({
  from: 'A',
  to: 'B',
  departure: 'now',
  scenario,
  longTrip,
  serviceOverdue: false,
})

test('points match the numbers written in the database function', () => {
  assert.equal(assess(trip('clear', false)).points, 0)
  assert.equal(assess(trip('rain', false)).points, 10)
  assert.equal(assess(trip('accident', false)).points, 15)
  assert.equal(assess(trip('hail', false)).points, 20)
  assert.equal(assess(trip('rain', true)).points, 25)
  assert.equal(assess(trip('hail', true)).points, 35)
})

test('the biggest single award stays under the database cap of 60', () => {
  const biggest = Math.max(...(['clear', 'rain', 'accident', 'hail'] as Scenario[]).map((s) => assess(trip(s, true)).points))
  assert.ok(biggest <= 60)
})