// The Trip Advisor rules. Pure functions, no React, so they are easy to test.
// Conditions come from a DEMO scenario chosen on screen. Live network and weather data replace this later.

export type Level = 'low' | 'medium' | 'high'
export type FactorKey = 'weather' | 'traffic' | 'route' | 'vehicle'
export type Scenario = 'clear' | 'rain' | 'hail' | 'accident'
export type Departure = 'now' | 'in-1h' | 'in-2h'
export type Action = 'travel-now' | 'wait' | 'reroute' | 'avoid'

export type TripInput = {
  from: string
  to: string
  departure: Departure
  scenario: Scenario
  longTrip: boolean
  serviceOverdue: boolean
}

export type Factor = { key: FactorKey; label: string; level: Level; note: string }

export type Advice = {
  action: Action
  headline: string
  detail: string
  reason: string
  riskScore: number
  factors: Factor[]
  extras: string[]
  points: number
}

export const DEPARTURES: Departure[] = ['now', 'in-1h', 'in-2h']

export const DEPARTURE_LABEL: Record<Departure, string> = {
  now: 'Now',
  'in-1h': 'In 1 hour',
  'in-2h': 'In 2 hours',
}

const DEPARTURE_PHRASE: Record<Departure, string> = {
  now: 'now',
  'in-1h': 'in 1 hour',
  'in-2h': 'in 2 hours',
}

export const SCENARIOS: { value: Scenario; label: string; hint: string }[] = [
  { value: 'clear', label: 'Clear day', hint: 'Normal conditions' },
  { value: 'rain', label: 'Heavy rain', hint: 'A storm passing through' },
  { value: 'hail', label: 'Hail warning', hint: 'Severe weather alert' },
  { value: 'accident', label: 'Accident ahead', hint: 'Major incident on the route' },
]

type Conditions = { weather: Level; traffic: Level; route: Level }

const TIMELINE: Record<Scenario, Record<Departure, Conditions>> = {
  clear: {
    now: { weather: 'low', traffic: 'low', route: 'low' },
    'in-1h': { weather: 'low', traffic: 'low', route: 'low' },
    'in-2h': { weather: 'low', traffic: 'low', route: 'low' },
  },
  rain: {
    now: { weather: 'high', traffic: 'medium', route: 'medium' },
    'in-1h': { weather: 'medium', traffic: 'medium', route: 'low' },
    'in-2h': { weather: 'low', traffic: 'low', route: 'low' },
  },
  hail: {
    now: { weather: 'high', traffic: 'low', route: 'high' },
    'in-1h': { weather: 'high', traffic: 'low', route: 'high' },
    'in-2h': { weather: 'low', traffic: 'low', route: 'low' },
  },
  accident: {
    now: { weather: 'low', traffic: 'high', route: 'high' },
    'in-1h': { weather: 'low', traffic: 'high', route: 'medium' },
    'in-2h': { weather: 'low', traffic: 'medium', route: 'low' },
  },
}

const KEYS: FactorKey[] = ['weather', 'traffic', 'route', 'vehicle']
const WEIGHT: Record<FactorKey, number> = { weather: 30, traffic: 20, route: 30, vehicle: 20 }
const LEVEL_VALUE: Record<Level, number> = { low: 0, medium: 0.5, high: 1 }
const FACTOR_LABEL: Record<FactorKey, string> = {
  weather: 'Weather',
  traffic: 'Traffic',
  route: 'Route risk',
  vehicle: 'Vehicle health',
}

// Points a driver can earn for the safer choice (matches the rewards table in the pitch).
const ACTION_POINTS: Record<Action, number> = { 'travel-now': 0, wait: 10, reroute: 15, avoid: 20 }
const BREAK_POINTS = 15

// Shown in the rewards history when the driver takes the safer option.
const ACTION_REASON: Record<Action, string> = {
  'travel-now': 'Safe trip',
  wait: 'Waited out bad weather',
  reroute: 'Took a safer route',
  avoid: 'Avoided travel during a hail warning',
}

type Levels = Record<FactorKey, Level>

function levelsFor(input: TripInput, departure: Departure): Levels {
  const conditions = TIMELINE[input.scenario][departure]
  return { ...conditions, vehicle: input.serviceOverdue ? 'medium' : 'low' }
}

function scoreOf(levels: Levels): number {
  const total = KEYS.reduce((sum, key) => sum + WEIGHT[key] * LEVEL_VALUE[levels[key]], 0)
  return Math.round(total)
}

function decide(levels: Levels, scenario: Scenario, score: number): Action {
  if (levels.weather === 'high' && scenario === 'hail') return 'avoid'
  if (levels.weather === 'high') return 'wait'
  if (levels.traffic === 'high' || levels.route === 'high') return 'reroute'
  if (score >= 30) return 'wait'
  return 'travel-now'
}

function noteFor(key: FactorKey, level: Level, scenario: Scenario): string {
  if (key === 'weather') {
    if (level === 'low') return scenario === 'clear' ? 'Clear skies on your route.' : 'The bad weather has passed.'
    if (level === 'medium') return 'The storm is easing along your route.'
    return scenario === 'hail' ? 'Hail warning over your route.' : 'Heavy rain over your route.'
  }
  if (key === 'traffic') {
    if (level === 'low') return 'Traffic is flowing normally.'
    if (level === 'medium') return 'Slower than usual, some congestion.'
    return 'Heavy congestion ahead.'
  }
  if (key === 'route') {
    if (level === 'low') return 'No hazards recorded on this route.'
    if (level === 'medium') return 'Some hazards recorded. Take extra care.'
    return scenario === 'accident'
      ? 'An accident is blocking part of this route.'
      : 'Exposed road with little cover during the warning.'
  }
  return level === 'low'
    ? 'No service issues recorded.'
    : 'Your service is overdue. Brakes and tyres matter most in bad weather.'
}

export type TripErrors = { from: string; to: string }

export function validateTrip(input: Pick<TripInput, 'from' | 'to'>): TripErrors {
  const from = input.from.trim()
  const to = input.to.trim()
  return {
    from: from === '' ? 'Enter where you are leaving from.' : '',
    to:
      to === ''
        ? 'Enter where you are going.'
        : from !== '' && from.toLowerCase() === to.toLowerCase()
          ? 'Choose a different destination.'
          : '',
  }
}

export function assess(input: TripInput): Advice {
  const levels = levelsFor(input, input.departure)
  const riskScore = scoreOf(levels)
  const action = decide(levels, input.scenario, riskScore)

  // The first later departure (within 2 hours) that would be safe to travel.
  const later = DEPARTURES.slice(DEPARTURES.indexOf(input.departure) + 1).find((departure) => {
    const laterLevels = levelsFor(input, departure)
    return decide(laterLevels, input.scenario, scoreOf(laterLevels)) === 'travel-now'
  })

  let headline = ''
  let detail = ''
  if (action === 'travel-now') {
    headline = 'Travel now. Conditions look good.'
    detail = 'Nothing on your route needs a change. Drive safely and arrive well.'
  } else if (action === 'reroute') {
    headline = 'Take a safer route.'
    detail = 'An alternative route avoids the worst of it. It may add a few minutes but cuts your risk.'
  } else if (action === 'wait') {
    headline = 'Wait before you leave.'
    detail = later
      ? `Leaving ${DEPARTURE_PHRASE[later]} lowers your risk from ${riskScore} to ${scoreOf(levelsFor(input, later))}.`
      : 'Conditions stay poor for the next 2 hours. Check again soon.'
  } else {
    headline = 'Avoid travel for now.'
    detail = later
      ? `Find covered parking and leave ${DEPARTURE_PHRASE[later]}, once the warning has passed.`
      : 'The warning stays active for the next 2 hours. Stay where you are if you can.'
  }

  const extras: string[] = []
  if (input.longTrip) extras.push(`Long trip: plan a 15-minute break every 2 hours (+${BREAK_POINTS} points).`)
  if (input.serviceOverdue) extras.push('Your service is overdue. Booking it earns 15 to 25 points.')

  return {
    action,
    headline,
    detail,
    reason: ACTION_REASON[action] + (input.longTrip ? ' and planned a break' : ''),
    riskScore,
    factors: KEYS.map((key) => ({
      key,
      label: FACTOR_LABEL[key],
      level: levels[key],
      note: noteFor(key, levels[key], input.scenario),
    })),
    extras,
    points: ACTION_POINTS[action] + (input.longTrip ? BREAK_POINTS : 0),
  }
}