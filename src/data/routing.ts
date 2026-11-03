// Map and route rules for the Trip Advisor. Pure functions with no React, no Leaflet and no network,
// so they are easy to test. The network calls live in lib/mapApi.ts.
import { DEPARTURES, DEPARTURE_LABEL, assess } from './advisor.ts'
import type { Action, Departure, TripInput } from './advisor.ts'

export type Place = { label: string; lat: number; lon: number }

export type RouteOption = {
  id: string
  durationSec: number
  distanceM: number
  path: [number, number][] // [lat, lon] pairs, ready for the map
}

export type RiskLevel = 'low' | 'medium' | 'high'

export type RankedRoute = RouteOption & {
  name: string
  risk: number
  level: RiskLevel
  extraMinutes: number
  fastest: boolean
  recommended: boolean
}

export type DepartureOption = {
  departure: Departure
  label: string
  riskScore: number
  action: Action
  recommended: boolean
}

// ---------- Web addresses ----------

/** OpenStreetMap Nominatim place search, limited to South Africa. Search on request only, never per keystroke. */
export function nominatimUrl(query: string): string {
  return `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=za&q=${encodeURIComponent(query.trim())}`
}

/** OSRM demo router. Up to 3 driving routes with their full shape. For demos only. */
export function osrmUrl(from: Place, to: Place): string {
  const point = (place: Place): string => `${place.lon.toFixed(6)},${place.lat.toFixed(6)}`
  return `https://router.project-osrm.org/route/v1/driving/${point(from)};${point(to)}?alternatives=3&overview=full&geometries=geojson&steps=false`
}

// ---------- Reading the answers ----------

function toNumber(value: unknown): number {
  return (typeof value === 'string' && value.trim() !== '') || typeof value === 'number' ? Number(value) : Number.NaN
}

export function shortLabel(displayName: string): string {
  const parts = displayName
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
  return parts.length === 0 ? displayName : parts.slice(0, 3).join(', ')
}

export function parseNominatim(json: unknown): Place[] {
  if (!Array.isArray(json)) return []
  const places: Place[] = []
  for (const item of json) {
    if (typeof item !== 'object' || item === null) continue
    const record = item as Record<string, unknown>
    const lat = toNumber(record.lat)
    const lon = toNumber(record.lon)
    if (typeof record.display_name !== 'string') continue
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) continue
    places.push({ label: shortLabel(record.display_name), lat, lon })
  }
  return places
}

export function parseOsrm(json: unknown): RouteOption[] {
  if (typeof json !== 'object' || json === null) return []
  const data = json as { code?: unknown; routes?: unknown }
  if (data.code !== 'Ok' || !Array.isArray(data.routes)) return []

  const routes: RouteOption[] = []
  for (const item of data.routes.slice(0, 3)) {
    if (typeof item !== 'object' || item === null) continue
    const record = item as { duration?: unknown; distance?: unknown; geometry?: { coordinates?: unknown } }
    const durationSec = toNumber(record.duration)
    const distanceM = toNumber(record.distance)
    const coordinates = record.geometry?.coordinates
    if (!Number.isFinite(durationSec) || !Number.isFinite(distanceM) || !Array.isArray(coordinates)) continue

    const path: [number, number][] = []
    for (const pair of coordinates) {
      if (!Array.isArray(pair)) continue
      const lon = toNumber(pair[0])
      const lat = toNumber(pair[1])
      if (Number.isFinite(lat) && Number.isFinite(lon)) path.push([lat, lon])
    }
    if (path.length < 2) continue
    routes.push({ id: `r${routes.length}`, durationSec, distanceM, path })
  }
  return routes
}

// ---------- Wording ----------

export function formatDuration(seconds: number): string {
  const minutes = Math.round(Math.max(0, seconds) / 60)
  if (minutes < 1) return 'Under 1 min'
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`
}

export function formatDistance(meters: number): string {
  const value = Math.max(0, meters)
  return value < 1000 ? `${Math.round(value)} m` : `${(value / 1000).toFixed(1)} km`
}

export function riskLevel(score: number): RiskLevel {
  if (score < 30) return 'low'
  if (score < 60) return 'medium'
  return 'high'
}

// ---------- Choosing places ----------

export function haversineKm(a: Pick<Place, 'lat' | 'lon'>, b: Pick<Place, 'lat' | 'lon'>): number {
  const toRad = (degrees: number): number => (degrees * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)))
}

export function validatePlaces(from: Place | null, to: Place | null): { from: string; to: string } {
  const errors = { from: '', to: '' }
  if (from === null) errors.from = 'Search and choose where you are leaving from.'
  if (to === null) errors.to = 'Search and choose your destination.'
  if (from !== null && to !== null && haversineKm(from, to) < 0.2) {
    errors.to = 'Choose a destination that is not the same place.'
  }
  return errors
}

// ---------- Options ----------

/** The same trip left now, in 1 hour and in 2 hours. The recommended time is the earliest safe one. */
export function departureOptions(base: TripInput): DepartureOption[] {
  const items: DepartureOption[] = DEPARTURES.map((departure) => {
    const advice = assess({ ...base, departure })
    return {
      departure,
      label: DEPARTURE_LABEL[departure],
      riskScore: advice.riskScore,
      action: advice.action,
      recommended: false,
    }
  })
  const acceptable = items.find((item) => item.action === 'travel-now' || item.action === 'reroute')
  const best = acceptable ?? items.reduce((lowest, item) => (item.riskScore < lowest.riskScore ? item : lowest), items[0])
  return items.map((item) => ({ ...item, recommended: item.departure === best.departure }))
}

/**
 * Scores each route. Longer routes add a little exposure. When there is an incident on the main route
 * (the advice is "reroute"), the main route gets riskier and the alternatives safer. DEMO logic, not live data.
 */
export function rankRoutes(routes: RouteOption[], baseRisk: number, incidentOnMainRoute: boolean): RankedRoute[] {
  if (routes.length === 0) return []
  const quickest = Math.min(...routes.map((route) => route.durationSec))

  const scored = routes.map((route, index) => {
    const extraMinutes = Math.max(0, Math.round((route.durationSec - quickest) / 60))
    const exposure = Math.min(15, Math.round(extraMinutes / 2))
    const shift = incidentOnMainRoute ? (index === 0 ? 20 : -25) : 0
    const risk = Math.max(0, Math.min(100, Math.round(baseRisk + shift + exposure)))
    return {
      ...route,
      name: index === 0 ? 'Main route' : `Alternative ${index}`,
      risk,
      level: riskLevel(risk),
      extraMinutes,
      fastest: route.durationSec === quickest,
      recommended: false,
    }
  })

  const best = scored.reduce((winner, route) =>
    route.risk < winner.risk || (route.risk === winner.risk && route.durationSec < winner.durationSec) ? route : winner,
  )
  return scored.map((route) => ({ ...route, recommended: route.id === best.id }))
}

/** One plain sentence: when to leave and which route to take. */
export function recommendTrip(departures: DepartureOption[], routes: RankedRoute[]): string {
  const departure = departures.find((item) => item.recommended)
  const route = routes.find((item) => item.recommended)
  if (!departure) return ''

  const poor = departure.action === 'wait' || departure.action === 'avoid'
  const when = poor
    ? `Conditions stay poor for the next 2 hours. The lowest-risk time is ${departure.label.toLowerCase()}`
    : departure.departure === 'now'
      ? 'Leave now'
      : `Leave ${departure.label.toLowerCase()}`

  const how = route
    ? ` on the ${route.name.toLowerCase()} (${formatDuration(route.durationSec)}, ${formatDistance(route.distanceM)}, risk ${route.risk})`
    : ''
  return `${when}${how}.`
}