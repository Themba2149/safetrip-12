import { parseWeather, weatherUrl } from '../data/weather'
import type { WeatherForecast } from '../data/weather'
import type { Place } from '../data/routing'

const TIMEOUT_MS = 10_000

/** Hourly forecast for a place. Never throws: on failure the error says what to do next. */
export async function fetchWeather(place: Place): Promise<{ forecast: WeatherForecast | null; error: string }> {
  try {
    const response = await fetch(weatherUrl(place.lat, place.lon), { signal: AbortSignal.timeout(TIMEOUT_MS) })
    if (!response.ok) return { forecast: null, error: 'The weather service is busy.' }
    const forecast = parseWeather(await response.json())
    if (!forecast) return { forecast: null, error: 'The weather service sent an answer we could not read.' }
    return { forecast, error: '' }
  } catch {
    return { forecast: null, error: 'Could not reach the weather service.' }
  }
}