// "How safe is this road?" for the Trip Advisor: traffic, hijacking and the car.
// ESTIMATES ONLY. Nothing here is live crime or traffic data. Traffic comes from the advice plus rush hour,
// hijacking from the time of day plus any hotspot zones loaded below, the car from the driver's own quick check.
import { haversineKm, riskLevel } from './routing.ts'
import type { Departure, Level } from './advisor.ts'

export type MeasureKey = 'traffic' | 'hijack' | 'car'

export type Measure = {
  key: MeasureKey
  label: string
  score: number // 0 to 100, higher is riskier
  level: Level
  summary: string
  tips: string[]
}

const clamp = (value: number): number => Math.max(0, Math.min(100, Math.round(value)))

// ---------- Time (South Africa Standard Time, UTC+2, no daylight saving) ----------

function sast(date: Date): { hour: number; day: number } {
  const shifted = new Date(date.getTime() + 2 * 3_600_000)
  return { hour: shifted.getUTCHours(), day: shifted.getUTCDay() } // day 0 = Sunday
}

const OFFSET_HOURS: Record<Departure, number> = { now: 0, 'in-1h': 1, 'in-2h': 2 }

export function departureTime(now: Date, departure: Departure): Date {
  return new Date(now.getTime() + OFFSET_HOURS[departure] * 3_600_000)
}

// ---------- Traffic ----------

const TRAFFIC_BASE: Record<Level, number> = { low: 10, medium: 45, high: 80 }

/** Weekday commuter rush: 06:00 to 08:59 and 16:00 to 18:59. */
export function isRushHour(date: Date): boolean {
  const { hour, day } = sast(date)
  return day >= 1 && day <= 5 && ((hour >= 6 && hour < 9) || (hour >= 16 && hour < 19))
}

/** A made-up reading shaped like what an operator could expose through network APIs. Always shown as simulated. */
export function networkInsight(trafficScore: number): { congestionPercent: number; averageSpeedKmh: number } {
  return {
    congestionPercent: clamp(trafficScore * 0.85),
    averageSpeedKmh: Math.max(20, Math.min(110, Math.round(110 - trafficScore * 0.8))),
  }
}

export function trafficMeasure(advisorTraffic: Level, when: Date): Measure {
  const rush = isRushHour(when)
  const score = clamp(TRAFFIC_BASE[advisorTraffic] + (rush ? 20 : 0))
  const level = riskLevel(score)
  const word = level === 'low' ? 'Light' : level === 'medium' ? 'Moderate' : 'Heavy'
  const tips =
    level === 'high'
      ? ['Allow extra time and keep a safe following distance.', 'Consider another route or a later departure.']
      : level === 'medium'
        ? ['Expect some delays and leave a little earlier.']
        : ['Roads look clear for your time.']
  return {
    key: 'traffic',
    label: 'Traffic',
    score,
    level,
    summary: `${word} traffic expected${rush ? ' (rush hour)' : ''}.`,
    tips,
  }
}

// ---------- Hijacking ----------

export type HotspotZone = {
  name: string
  lat: number
  lon: number
  radiusKm: number
  level: Level
  source: string // where the information came from, for example a police precinct report or a partner insurer
}

/**
 * Real hotspot zones go here, taken from a trusted source such as official crime statistics or a partner insurer.
 * It is EMPTY on purpose: SafeTrip does not invent crime data. Until it is filled, hijacking uses the time of day only.
 */
export const HOTSPOT_ZONES: HotspotZone[] = []

const ZONE_POINTS: Record<Level, number> = { low: 10, medium: 20, high: 35 }

export type DayPart = 'night' | 'evening' | 'day'

export function dayPart(date: Date): DayPart {
  const { hour } = sast(date)
  if (hour >= 22 || hour < 5) return 'night'
  if (hour >= 18 || hour < 6) return 'evening'
  return 'day'
}

const DAY_PART_SCORE: Record<DayPart, number> = { night: 60, evening: 40, day: 15 }

/** Zones within reach of the route. Looks at a sample of the route points to stay quick on long routes. */
export function zonesNearRoute(path: [number, number][], zones: HotspotZone[]): HotspotZone[] {
  if (path.length === 0 || zones.length === 0) return []
  const step = Math.max(1, Math.floor(path.length / 200))
  return zones.filter((zone) => {
    for (let i = 0; i < path.length; i += step) {
      if (haversineKm({ lat: path[i][0], lon: path[i][1] }, zone) <= zone.radiusKm) return true
    }
    return false
  })
}

export function hijackMeasure(when: Date, nearZones: HotspotZone[], hasZoneData: boolean): Measure {
  const part = dayPart(when)
  const score = clamp(DAY_PART_SCORE[part] + nearZones.reduce((sum, zone) => sum + ZONE_POINTS[zone.level], 0))
  const level = riskLevel(score)

  const partText = part === 'night' ? 'Night trip.' : part === 'evening' ? 'Evening or early-morning trip.' : 'Daytime trip.'
  const zoneText =
    nearZones.length > 0
      ? ` Passes near ${nearZones.map((zone) => zone.name).join(', ')}.`
      : hasZoneData
        ? ' No flagged areas on this route.'
        : ' No hotspot data is loaded, so this uses the time of day only.'

  const tips = ['Keep doors locked and valuables out of sight.']
  if (level !== 'low') {
    tips.push('Share your trip and expected arrival with someone.')
    tips.push('Plan fuel and breaks in busy, well-lit places.')
    tips.push('Slow down early at gates and driveways, and look around before you turn in.')
  }
  if (level === 'high') tips.push('If you can, travel in daylight or with another vehicle.')

  return { key: 'hijack', label: 'Hijacking', score, level, summary: `${partText}${zoneText}`, tips }
}

// ---------- The car (a quick pre-trip check) ----------

export type CarCheckKey = 'fuel' | 'tyres' | 'lights' | 'wipers' | 'warnings'
export type CarAnswer = 'good' | 'attention' | null
export type CarAnswers = Partial<Record<CarCheckKey, CarAnswer>>

export const CAR_CHECK_ITEMS: { key: CarCheckKey; label: string; hint: string }[] = [
  { key: 'fuel', label: 'Fuel', hint: 'Enough for the trip, with some spare' },
  { key: 'tyres', label: 'Tyres', hint: 'Good tread, no cracks or bulges, pressure ok' },
  { key: 'lights', label: 'Lights', hint: 'Headlights, brake lights and indicators work' },
  { key: 'wipers', label: 'Wipers and screen', hint: 'Wipers clear the glass, washer fluid topped up' },
  { key: 'warnings', label: 'Warning lights', hint: 'No warning light on the dashboard' },
]

const CAR_WEIGHT: Record<CarCheckKey, number> = { fuel: 15, tyres: 30, lights: 25, wipers: 15, warnings: 30 }
const SERVICE_WEIGHT = 25

const CAR_TIP: Record<CarCheckKey, string> = {
  fuel: 'Fill up before you leave.',
  tyres: 'Have the tyres checked before a long drive.',
  lights: 'Fix faulty lights before dark.',
  wipers: 'Replace worn wipers and top up the washer fluid.',
  warnings: 'Have the warning light checked. Do not ignore it.',
}

export type CarCheck = {
  answered: number
  attention: string[] // labels of the items marked "needs attention"
  serviceOverdue: boolean
  score: number
  level: Level
}

export function carCheck(answers: CarAnswers, serviceOverdue: boolean): CarCheck {
  const answered = CAR_CHECK_ITEMS.filter((item) => answers[item.key] === 'good' || answers[item.key] === 'attention').length
  const flagged = CAR_CHECK_ITEMS.filter((item) => answers[item.key] === 'attention')
  const score = clamp(flagged.reduce((sum, item) => sum + CAR_WEIGHT[item.key], 0) + (serviceOverdue ? SERVICE_WEIGHT : 0))
  return {
    answered,
    attention: flagged.map((item) => item.label),
    serviceOverdue,
    score,
    level: riskLevel(score),
  }
}

export function carMeasure(check: CarCheck, answers: CarAnswers): Measure {
  const issues = [...check.attention, ...(check.serviceOverdue ? ['Service overdue'] : [])]
  let summary: string
  if (issues.length > 0) summary = `Needs attention: ${issues.join(', ')}.`
  else if (check.answered === 0) summary = 'Do the quick car check for a full picture.'
  else if (check.answered < CAR_CHECK_ITEMS.length) summary = `Nothing flagged so far (${check.answered} of ${CAR_CHECK_ITEMS.length} checked).`
  else summary = 'Nothing flagged. Your car is ready.'

  const tips = CAR_CHECK_ITEMS.filter((item) => answers[item.key] === 'attention').map((item) => CAR_TIP[item.key])
  if (check.serviceOverdue) tips.push('Book your service. Maintenance can earn reward points.')
  return { key: 'car', label: 'Car inspection', score: check.score, level: check.level, summary, tips }
}

/** The one measure to look at first. A tie goes to the earlier one in the list. */
export function highestConcern(measures: Measure[]): Measure | null {
  if (measures.length === 0) return null
  return measures.reduce((worst, next) => (next.score > worst.score ? next : worst))
}