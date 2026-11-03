// SAMPLE DATA ONLY. Phase 8 replaces this with real trips from the database.
// The rules (score bands, points-to-discount, discount-only premium) are real and tested separately.

export type Trip = {
  id: string
  date: string
  route: string
  km: number
  score: number
  points: number
  note: string
}

export type WeekScore = { label: string; score: number }

export type ScoreBand = { label: string; tone: 'good' | 'ok' | 'low' }

export const BASE_MONTHLY_PREMIUM = 850 // rand, matches the pitch deck example
export const POINTS_PER_PERCENT = 100 // 100 points = 1% off
export const MAX_DISCOUNT_PERCENT = 15 // up to 15% off

export const sampleTrips: Trip[] = [
  { id: 't1', date: 'Today', route: 'Sandton to Midrand', km: 24, score: 91, points: 48, note: 'Left before the rain. Smooth braking.' },
  { id: 't2', date: 'Yesterday', route: 'Midrand to Pretoria CBD', km: 38, score: 82, points: 36, note: 'Two harsh brakes near Centurion.' },
  { id: 't3', date: 'Mon', route: 'Pretoria CBD to Sandton', km: 52, score: 77, points: 28, note: 'Night driving in heavy traffic.' },
  { id: 't4', date: 'Sun', route: 'Sandton to Rosebank', km: 9, score: 88, points: 22, note: 'Steady speed, no alerts.' },
]

export const weeklyScores: WeekScore[] = [
  { label: 'W1', score: 68 },
  { label: 'W2', score: 72 },
  { label: 'W3', score: 79 },
  { label: 'W4', score: 76 },
  { label: 'W5', score: 81 },
  { label: 'W6', score: 84 },
]

export const sampleWalletPoints = 1240

/** Good from 80, fair from 60, otherwise "needs work". */
export function scoreBand(score: number): ScoreBand {
  if (score >= 80) return { label: 'Safe driver', tone: 'good' }
  if (score >= 60) return { label: 'Getting there', tone: 'ok' }
  return { label: 'Needs work', tone: 'low' }
}

/**
 * 100 points = 1% off, up to 15%. Points can only add discount. There is no way
 * to get a surcharge: "your premium can only go down".
 */
export function discountPercent(points: number): number {
  const raw = Math.floor(points / POINTS_PER_PERCENT)
  return Math.max(0, Math.min(MAX_DISCOUNT_PERCENT, raw))
}

export function discountedPremium(points: number): number {
  return Math.round(BASE_MONTHLY_PREMIUM * (1 - discountPercent(points) / 100))
}

/** Points still needed for the next 1% off, or null once the 15% cap is reached. */
export function pointsToNextPercent(points: number): number | null {
  if (discountPercent(points) >= MAX_DISCOUNT_PERCENT) return null
  return POINTS_PER_PERCENT - (Math.max(0, points) % POINTS_PER_PERCENT)
}

export function averageScore(trips: Trip[]): number {
  if (trips.length === 0) return 0
  return Math.round(trips.reduce((sum, trip) => sum + trip.score, 0) / trips.length)
}