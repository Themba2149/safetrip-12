import test from 'node:test'
import assert from 'node:assert/strict'
import { DEPARTURES, SCENARIOS, assess, validateTrip } from './advisor.ts'
import type { TripInput } from './advisor.ts'

const base: TripInput = {
  from: 'Sandton',
  to: 'Pretoria',
  departure: 'now',
  scenario: 'clear',
  longTrip: false,
  serviceOverdue: false,
}

test('a clear day means travel now with no points and zero risk', () => {
  const advice = assess(base)
  assert.equal(advice.action, 'travel-now')
  assert.equal(advice.riskScore, 0)
  assert.equal(advice.points, 0)
})

test('heavy rain now means wait, and leaving in 1 hour is safe', () => {
  const advice = assess({ ...base, scenario: 'rain' })
  assert.equal(advice.action, 'wait')
  assert.equal(advice.points, 10)
  assert.match(advice.detail, /in 1 hour/)
})

test('a hail warning means avoid, with 20 points for the safer choice', () => {
  const advice = assess({ ...base, scenario: 'hail' })
  assert.equal(advice.action, 'avoid')
  assert.equal(advice.points, 20)
  assert.match(advice.detail, /in 2 hours/)
})

test('an accident means reroute', () => {
  const advice = assess({ ...base, scenario: 'accident' })
  assert.equal(advice.action, 'reroute')
  assert.equal(advice.points, 15)
})

test('leaving later changes the advice once the storm has passed', () => {
  assert.equal(assess({ ...base, scenario: 'rain', departure: 'in-2h' }).action, 'travel-now')
})

test('a long trip adds the break points, and an overdue service raises risk', () => {
  assert.equal(assess({ ...base, longTrip: true }).points, 15)
  assert.equal(assess({ ...base, serviceOverdue: true }).riskScore, 10)
})

test('risk is always between 0 and 100 and there are four factors', () => {
  for (const scenario of SCENARIOS.map((s) => s.value)) {
    for (const departure of DEPARTURES) {
      for (const serviceOverdue of [false, true]) {
        const advice = assess({ ...base, scenario, departure, serviceOverdue })
        assert.ok(advice.riskScore >= 0 && advice.riskScore <= 100)
        assert.equal(advice.factors.length, 4)
      }
    }
  }
})

test('trip validation', () => {
  assert.equal(validateTrip({ from: '', to: 'x' }).from, 'Enter where you are leaving from.')
  assert.equal(validateTrip({ from: 'a', to: '' }).to, 'Enter where you are going.')
  assert.equal(validateTrip({ from: 'Sandton', to: ' sandton ' }).to, 'Choose a different destination.')
  assert.deepEqual(validateTrip({ from: 'a', to: 'b' }), { from: '', to: '' })
})