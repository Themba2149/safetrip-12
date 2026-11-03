import { nominatimUrl, osrmUrl, parseNominatim, parseOsrm } from '../data/routing'
import type { Place, RouteOption } from '../data/routing'

const TIMEOUT_MS = 10_000

/** Looks up a place by name. Call it when the driver presses Search, not on every key press. */
export async function searchPlaces(query: string): Promise<{ places: Place[]; error: string }> {
  const text = query.trim()
  if (text.length < 3) return { places: [], error: 'Type at least 3 letters, then press Search.' }
  try {
    const response = await fetch(nominatimUrl(text), { signal: AbortSignal.timeout(TIMEOUT_MS) })
    if (!response.ok) return { places: [], error: 'Place search is busy. Try again in a moment.' }
    const places = parseNominatim(await response.json())
    if (places.length === 0) return { places: [], error: 'No places found. Try a nearby suburb, town or landmark.' }
    return { places, error: '' }
  } catch {
    return { places: [], error: 'Could not reach place search. Check your internet connection and try again.' }
  }
}

/** Driving routes between two places (the main route plus up to two alternatives). */
export async function fetchRoutes(from: Place, to: Place): Promise<{ routes: RouteOption[]; error: string }> {
  try {
    const response = await fetch(osrmUrl(from, to), { signal: AbortSignal.timeout(TIMEOUT_MS) })
    if (!response.ok) return { routes: [], error: 'The route service is busy. The advice below still applies.' }
    const routes = parseOsrm(await response.json())
    if (routes.length === 0) return { routes: [], error: 'No driving route was found between these two places.' }
    return { routes, error: '' }
  } catch {
    return { routes: [], error: 'Could not load routes. The advice below still applies.' }
  }
}