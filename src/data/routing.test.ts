import test from 'node:test'
import assert from 'node:assert/strict'
import {
  departureOptions,
  formatDistance,
  formatDuration,
  haversineKm,
  nominatimUrl,
  osrmUrl,
  parseNominatim,
  parseOsrm,
  rankRoutes,
  recommendTrip,
  riskLevel,
  validatePlaces,
} from './routing.ts'
import type { Place, RouteOption } from './routing.ts'
import type { TripInput } from './advisor.ts'

const sandton: Place = { label: 'Sandton', lat: -26.1076, lon: 28.0567 }
const pretoria: Place = { label: 'Pretoria', lat: -25.7479, lon: 28.2293 }

const base: TripInput = {
  from: 'Sandton',
  to: 'Pretoria',
  departure: 'now',
  scenario: 'clear',
  longTrip: false,
  serviceOverdue: false,
}

const route = (id: string, minutes: number): RouteOption => ({
  id,
  durationSec: minutes * 60,
  distanceM: minutes * 1000,
  path: [
    [-26, 28],
    [-25.9, 28.1],
  ],
})

test('web addresses are built correctly', () => {
  assert.match(nominatimUrl(' Sandton City '), /q=Sandton%20City$/)
  assert.match(nominatimUrl('x'), /countrycodes=za/)
  const url = osrmUrl(sandton, pretoria)
  assert.match(url, /28\.056700,-26\.107600;28\.229300,-25\.747900/)
  assert.match(url, /alternatives=3/)
})

test('place search results are read safely', () => {
  const places = parseNominatim([
    { display_name: 'Sandton City, Sandton, Johannesburg, Gauteng, South Africa', lat: '-26.1076', lon: '28.0567' },
    { display_name: 'Broken', lat: 'abc', lon: '28' },
    { lat: '1', lon: '1' },
    { display_name: 'Null island', lat: null, lon: null },
    null,
    'text',
  ])
  assert.equal(places.length, 1)
  assert.equal(places[0].label, 'Sandton City, Sandton, Johannesburg')
  assert.deepEqual(parseNominatim('nope'), [])
})

test('routes are read, flipped to lat/lon, and bad ones are skipped', () => {
  const routes = parseOsrm({
    code: 'Ok',
    routes: [
      { duration: 2400, distance: 38000, geometry: { coordinates: [[28.05, -26.1], [28.2, -25.7]] } },
      { duration: 'x', distance: 1, geometry: { coordinates: [[1, 2], [3, 4]] } },
      { duration: 2700, distance: 40000, geometry: { coordinates: [[28.05, -26.1], [28.3, -25.8]] } },
      { duration: 3000, distance: 41000, geometry: { coordinates: [[28.0, -26.0]] } },
    ],
  })
  assert.equal(routes.length, 2)
  assert.deepEqual(routes[0].path[0], [-26.1, 28.05])
  assert.deepEqual(routes.map((item) => item.id), ['r0', 'r1'])
  assert.deepEqual(parseOsrm({ code: 'NoRoute', routes: [] }), [])
  assert.deepEqual(parseOsrm(null), [])
})

test('times, distances and risk levels read well', () => {
  assert.equal(formatDuration(20), 'Under 1 min')
  assert.equal(formatDuration(42 * 60), '42 min')
  assert.equal(formatDuration(60 * 60), '1 h')
  assert.equal(formatDuration(65 * 60), '1 h 5 min')
  assert.equal(formatDistance(850), '850 m')
  assert.equal(formatDistance(38240), '38.2 km')
  assert.equal(riskLevel(29), 'low')
  assert.equal(riskLevel(30), 'medium')
  assert.equal(riskLevel(60), 'high')
})

test('distance between places and place checks', () => {
  const km = haversineKm(sandton, pretoria)
  assert.ok(km > 35 && km < 45)
  assert.deepEqual(validatePlaces(sandton, pretoria), { from: '', to: '' })
  assert.match(validatePlaces(null, pretoria).from, /leaving from/)
  assert.match(validatePlaces(sandton, null).to, /destination/)
  assert.match(validatePlaces(sandton, { ...sandton, label: 'Same' }).to, /not the same place/)
})

test('departure options pick the earliest safe time', () => {
  const clear = departureOptions(base)
  assert.equal(clear.find((item) => item.recommended)?.departure, 'now')

  const rain = departureOptions({ ...base, scenario: 'rain' })
  assert.equal(rain.find((item) => item.recommended)?.departure, 'in-1h')

  const hail = departureOptions({ ...base, scenario: 'hail' })
  assert.equal(hail.find((item) => item.recommended)?.departure, 'in-2h')

  // An accident can be driven around, so leaving now on another route is acceptable.
  const accident = departureOptions({ ...base, scenario: 'accident' })
  assert.equal(accident.find((item) => item.recommended)?.departure, 'now')
  assert.equal(accident.filter((item) => item.recommended).length, 1)
})

test('with no incident the quickest route is recommended', () => {
  const ranked = rankRoutes([route('r0', 40), route('r1', 52)], 10, false)
  assert.equal(ranked.find((item) => item.recommended)?.id, 'r0')
  assert.equal(ranked[1].extraMinutes, 12)
  assert.ok(ranked[1].risk > ranked[0].risk)
  assert.equal(ranked[0].name, 'Main route')
  assert.equal(ranked[1].name, 'Alternative 1')
})

test('with an incident on the main route an alternative is recommended', () => {
  const ranked = rankRoutes([route('r0', 40), route('r1', 52)], 50, true)
  assert.equal(ranked.find((item) => item.recommended)?.id, 'r1')
  assert.ok(ranked[0].risk > ranked[1].risk)
})

test('risk stays between 0 and 100, and no routes gives nothing', () => {
  for (const item of rankRoutes([route('r0', 40), route('r1', 200)], 95, true)) {
    assert.ok(item.risk >= 0 && item.risk <= 100)
  }
  assert.deepEqual(rankRoutes([], 10, false), [])
})

test('the recommendation reads as one sentence', () => {
  const deps = departureOptions({ ...base, scenario: 'rain' })
  const ranked = rankRoutes([route('r0', 40)], deps.find((d) => d.recommended)?.riskScore ?? 0, false)
  assert.match(recommendTrip(deps, ranked), /^Leave in 1 hour on the main route \(40 min, 40\.0 km, risk \d+\)\.$/)
  assert.match(recommendTrip(departureOptions(base), []), /^Leave now\.$/)
  assert.equal(recommendTrip([], []), '')
})