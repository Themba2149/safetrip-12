// Live weather for the Trip Advisor. Pure functions (no React, no network) so they can be tested.
// The network call lives in lib/weatherApi.ts. Data: Open-Meteo (free, no key; demo-grade for the pilot).
import { DEPARTURES, assess } from './advisor.ts'
import type { Departure, Scenario, TripInput } from './advisor.ts'
import type { DepartureOption } from './routing.ts'

export type HourlyWeather = {
  time: string
  code: number
  rainMm: number
  gustKmh: number
}

export type WeatherForecast = {
  hours: HourlyWeather[] // index 0 = the current hour
}

export function weatherUrl(lat: number, lon: number): string {
  return (
    'https://api.open-meteo.com/v1/forecast' +
    `?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}` +
    '&hourly=weather_code,precipitation,wind_gusts_10m&forecast_hours=6&timezone=auto'
  )
}

function toNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : Number.NaN
}

export function parseWeather(json: unknown): WeatherForecast | null {
  if (typeof json !== 'object' || json === null) return null
  const hourly = (json as { hourly?: Record<string, unknown> }).hourly
  if (!hourly || !Array.isArray(hourly.time)) return null
  const codes = hourly.weather_code
  const rain = hourly.precipitation
  const gusts = hourly.wind_gusts_10m
  if (!Array.isArray(codes) || !Array.isArray(rain) || !Array.isArray(gusts)) return null

  const hours: HourlyWeather[] = []
  for (let i = 0; i < hourly.time.length; i++) {
    const code = toNumber(codes[i])
    const rainMm = toNumber(rain[i])
    if (typeof hourly.time[i] !== 'string' || Number.isNaN(code) || Number.isNaN(rainMm)) continue
    const gust = toNumber(gusts[i])
    hours.push({ time: hourly.time[i] as string, code, rainMm, gustKmh: Number.isNaN(gust) ? 0 : gust })
  }
  return hours.length === 0 ? null : { hours }
}

/** WMO weather codes 96 and 99 are thunderstorms with hail. */
export function isHailCode(code: number): boolean {
  return code === 96 || code === 99
}

/** Turns one hour of real weather into the scenario the advisor already understands. */
export function hourToScenario(hour: HourlyWeather): Scenario {
  if (isHailCode(hour.code)) return 'hail'
  const wetCode = (hour.code >= 51 && hour.code <= 67) || (hour.code >= 80 && hour.code <= 82) || hour.code === 95
  if (hour.rainMm >= 2 || wetCode) return 'rain'
  return 'clear'
}

const OFFSET: Record<Departure, number> = { now: 0, 'in-1h': 1, 'in-2h': 2 }

/** The scenario for a departure. Looks at the departure hour and the hour after it, and uses the worse one. */
export function scenarioFor(forecast: WeatherForecast, departure: Departure): Scenario {
  const rank: Record<Scenario, number> = { clear: 0, rain: 1, accident: 1, hail: 2 }
  const start = Math.min(OFFSET[departure], forecast.hours.length - 1)
  const window = forecast.hours.slice(start, start + 2)
  return window.map(hourToScenario).reduce((worst, next) => (rank[next] > rank[worst] ? next : worst), 'clear' as Scenario)
}

export function describeHour(hour: HourlyWeather): string {
  const scenario = hourToScenario(hour)
  const rain = hour.rainMm >= 0.1 ? `, ${hour.rainMm.toFixed(1)} mm rain` : ''
  const gust = hour.gustKmh >= 50 ? `, gusts ${Math.round(hour.gustKmh)} km/h` : ''
  const word = scenario === 'hail' ? 'Hail risk' : scenario === 'rain' ? 'Rain' : 'Clear'
  return `${word}${rain}${gust}`
}

/** Departure options where each time uses its own forecast. The earliest acceptable time is recommended. */
export function liveDepartureOptions(base: TripInput, forecast: WeatherForecast): DepartureOption[] {
  const items: DepartureOption[] = DEPARTURES.map((departure) => {
    const advice = assess({ ...base, departure, scenario: scenarioFor(forecast, departure) })
    return {
      departure,
      label: departure === 'now' ? 'Now' : departure === 'in-1h' ? 'In 1 hour' : 'In 2 hours',
      riskScore: advice.riskScore,
      action: advice.action,
      recommended: false,
    }
  })
  const acceptable = items.find((item) => item.action === 'travel-now' || item.action === 'reroute')
  const best = acceptable ?? items.reduce((lowest, item) => (item.riskScore < lowest.riskScore ? item : lowest), items[0])
  return items.map((item) => ({ ...item, recommended: item.departure === best.departure }))
}