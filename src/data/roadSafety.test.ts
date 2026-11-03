import test from 'node:test'
import assert from 'node:assert/strict'
import {
  carCheck,
  carMeasure,
  dayPart,
  departureTime,
  highestConcern,
  hijackMeasure,
  isRushHour,
  networkInsight,
  trafficMeasure,
  zonesNearRoute,
} from './roadSafety.ts'
import type { HotspotZone } from './roadSafety.ts'

// South Africa is UTC+2, so 05:00Z is 07:00 in Johannesburg.
const mondayMorning = new Date('2026-11-02T05:00:00Z') // Monday 07:00
const mondayNight = new Date('2026-11-02T21:30:00Z') // Monday 23:30
const saturdayNoon = new Date('2026-11-07T10:00:00Z') // Saturday 12:00

test('rush hour is a weekday thing', () => {
  assert.equal(isRushHour(mondayMorning), true)
  assert.equal(isRushHour(mondayNight), false)
  assert.equal(isRushHour(saturdayNoon), false)
  assert.equal(isRushHour(new Date('2026-11-02T14:30:00Z')), true) // Monday 16:30
})

test('leaving later moves the clock on', () => {
  assert.equal(departureTime(mondayMorning, 'in-2h').toISOString(), '2026-11-02T07:00:00.000Z')
  assert.equal(departureTime(mondayMorning, 'now').getTime(), mondayMorning.getTime())
})

test('traffic follows the advice and adds rush hour', () => {
  assert.equal(trafficMeasure('low', saturdayNoon).level, 'low')
  const rush = trafficMeasure('low', mondayMorning)
  assert.equal(rush.score, 30)
  assert.match(rush.summary, /rush hour/)
  assert.equal(trafficMeasure('high', mondayMorning).score, 100)
  assert.equal(trafficMeasure('high', saturdayNoon).level, 'high')
})

test('the simulated network reading stays in range and gets worse with traffic', () => {
  const light = networkInsight(10)
  const heavy = networkInsight(100)
  assert.ok(heavy.congestionPercent > light.congestionPercent)
  assert.ok(heavy.averageSpeedKmh < light.averageSpeedKmh)
  assert.ok(heavy.congestionPercent <= 100 && heavy.averageSpeedKmh >= 20)
})

test('the part of the day for hijacking', () => {
  assert.equal(dayPart(mondayNight), 'night')
  assert.equal(dayPart(saturdayNoon), 'day')
  assert.equal(dayPart(new Date('2026-11-02T17:00:00Z')), 'evening') // 19:00
})

test('hijacking: time of day only when no hotspot data is loaded', () => {
  const day = hijackMeasure(saturdayNoon, [], false)
  assert.equal(day.level, 'low')
  assert.match(day.summary, /No hotspot data is loaded/)
  const night = hijackMeasure(mondayNight, [], false)
  assert.equal(night.level, 'high')
  assert.ok(night.tips.length > day.tips.length)
})

test('hotspot zones near the route raise the score', () => {
  const zone: HotspotZone = { name: 'Test zone', lat: -26.1, lon: 28.05, radiusKm: 2, level: 'high', source: 'test' }
  const path: [number, number][] = [
    [-26.0, 28.0],
    [-26.1, 28.05],
    [-26.2, 28.1],
  ]
  const far: [number, number][] = [
    [-25.0, 27.0],
    [-25.1, 27.1],
  ]
  assert.equal(zonesNearRoute(path, [zone]).length, 1)
  assert.equal(zonesNearRoute(far, [zone]).length, 0)
  assert.deepEqual(zonesNearRoute([], [zone]), [])
  const withZone = hijackMeasure(saturdayNoon, [zone], true)
  assert.equal(withZone.score, 50)
  assert.match(withZone.summary, /Passes near Test zone/)
  assert.match(hijackMeasure(saturdayNoon, [], true).summary, /No flagged areas/)
})

test('the car check adds up what needs attention', () => {
  const clean = carCheck({ fuel: 'good', tyres: 'good', lights: 'good', wipers: 'good', warnings: 'good' }, false)
  assert.equal(clean.score, 0)
  assert.equal(clean.answered, 5)
  const bad = carCheck({ tyres: 'attention', warnings: 'attention' }, true)
  assert.equal(bad.score, 85)
  assert.equal(bad.level, 'high')
  assert.deepEqual(bad.attention, ['Tyres', 'Warning lights'])
  assert.equal(carCheck({ fuel: 'attention', lights: 'attention', tyres: 'attention', warnings: 'attention' }, true).score, 100)
})

test('car wording covers every case', () => {
  assert.match(carMeasure(carCheck({}, false), {}).summary, /Do the quick car check/)
  assert.match(carMeasure(carCheck({ fuel: 'good' }, false), { fuel: 'good' }).summary, /1 of 5/)
  const all = { fuel: 'good', tyres: 'good', lights: 'good', wipers: 'good', warnings: 'good' } as const
  assert.match(carMeasure(carCheck(all, false), all).summary, /ready/)
  const flagged = carMeasure(carCheck({ tyres: 'attention' }, true), { tyres: 'attention' })
  assert.match(flagged.summary, /Tyres, Service overdue/)
  assert.equal(flagged.tips.length, 2)
})

test('the highest concern is picked, and an empty list gives nothing', () => {
  const traffic = trafficMeasure('low', saturdayNoon)
  const hijack = hijackMeasure(mondayNight, [], false)
  assert.equal(highestConcern([traffic, hijack])?.key, 'hijack')
  assert.equal(highestConcern([]), null)
})