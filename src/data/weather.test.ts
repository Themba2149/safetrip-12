import test from 'node:test'
import assert from 'node:assert/strict'
import { hourToScenario, liveDepartureOptions, parseWeather, scenarioFor, weatherUrl, describeHour } from './weather.ts'
import type { WeatherForecast } from './weather.ts'
import type { TripInput } from './advisor.ts'

const base: TripInput = { from: 'A', to: 'B', departure: 'now', scenario: 'clear', longTrip: false, serviceOverdue: false }
const hour = (code: number, rainMm = 0, gustKmh = 0) => ({ time: 't', code, rainMm, gustKmh })
const forecast = (hours: ReturnType<typeof hour>[]): WeatherForecast => ({ hours })

test('weather address and parsing', () => {
  assert.match(weatherUrl(-26.1076, 28.0567), /latitude=-26\.1076&longitude=28\.0567/)
  const parsed = parseWeather({
    hourly: {
      time: ['a', 'b', 'c'],
      weather_code: [0, 63, null],
      precipitation: [0, 3.2, 1],
      wind_gusts_10m: [10, 55, 1],
    },
  })
  assert.equal(parsed?.hours.length, 2)
  assert.equal(parsed?.hours[1].rainMm, 3.2)
  assert.equal(parseWeather(null), null)
  assert.equal(parseWeather({ hourly: { time: [] } }), null)
})

test('hours map to scenarios', () => {
  assert.equal(hourToScenario(hour(0)), 'clear')
  assert.equal(hourToScenario(hour(3, 0.4)), 'clear')
  assert.equal(hourToScenario(hour(63, 0.5)), 'rain')
  assert.equal(hourToScenario(hour(0, 2.5)), 'rain')
  assert.equal(hourToScenario(hour(96, 5)), 'hail')
  assert.equal(hourToScenario(hour(99, 5)), 'hail')
})

test('a departure uses its hour and the next, taking the worse', () => {
  const f = forecast([hour(0), hour(0), hour(61, 3), hour(0), hour(0)])
  assert.equal(scenarioFor(f, 'now'), 'clear')
  assert.equal(scenarioFor(f, 'in-1h'), 'rain')
  assert.equal(scenarioFor(f, 'in-2h'), 'rain')
  assert.equal(scenarioFor(forecast([hour(0)]), 'in-2h'), 'clear')
})

test('live options recommend the earliest safe time', () => {
  const stormNow = forecast([hour(96, 6), hour(96, 6), hour(0), hour(0), hour(0)])
  const options = liveDepartureOptions(base, stormNow)
  assert.equal(options.filter((o) => o.recommended).length, 1)
  assert.equal(options.find((o) => o.departure === 'now')?.action, 'avoid')
  assert.notEqual(options.find((o) => o.recommended)?.departure, 'now')

  const fine = liveDepartureOptions(base, forecast([hour(0), hour(0), hour(0)]))
  assert.equal(fine.find((o) => o.recommended)?.departure, 'now')
})

test('hours are described plainly', () => {
  assert.equal(describeHour(hour(0)), 'Clear')
  assert.equal(describeHour(hour(63, 3.2, 60)), 'Rain, 3.2 mm rain, gusts 60 km/h')
  assert.match(describeHour(hour(96, 6)), /^Hail risk/)
})