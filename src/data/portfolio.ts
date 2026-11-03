// SAMPLE PORTFOLIO for the insurer view. Phase 8 replaces it with real, aggregated figures.
// The calculations are real and tested. The inputs, and the two assumptions below, are illustrative.
import { BASE_MONTHLY_PREMIUM } from './mockDriver.ts'

export type RiskBand = { label: string; drivers: number; tone: 'good' | 'ok' | 'low' }
export type DiscountTier = { label: string; percent: number; drivers: number }
export type AlertStat = { type: string; sent: number; followed: number }
export type Corridor = { name: string; level: 'low' | 'medium' | 'high'; note: string }

export const ENROLLED_DRIVERS = 5000 // pilot size in the pitch: Gauteng, 5,000 drivers

// Assumptions, shown on screen so nobody mistakes them for results.
export const CLAIM_RATE = 0.002 // 0.2% of high-risk trips that were avoided would have ended in a claim
export const AVERAGE_CLAIM_COST = 25000 // rand

export const riskBands: RiskBand[] = [
  { label: 'Safe driver', drivers: 2350, tone: 'good' },
  { label: 'Getting there', drivers: 1900, tone: 'ok' },
  { label: 'Needs work', drivers: 750, tone: 'low' },
]

export const discountTiers: DiscountTier[] = [
  { label: 'No discount yet', percent: 0, drivers: 1100 },
  { label: '1 to 5% off', percent: 3, drivers: 1500 },
  { label: '6 to 10% off', percent: 8, drivers: 1400 },
  { label: '11 to 15% off', percent: 13, drivers: 1000 },
]

export const alertStats: AlertStat[] = [
  { type: 'Heavy rain', sent: 4200, followed: 2730 },
  { type: 'Hail warning', sent: 640, followed: 512 },
  { type: 'Accident ahead', sent: 1900, followed: 1330 },
  { type: 'Congestion', sent: 6100, followed: 3050 },
]

// Alert types that mean a genuinely dangerous trip was avoided or changed.
export const HIGH_RISK_ALERTS = ['Heavy rain', 'Hail warning', 'Accident ahead']

export const weeklyClaimsAvoided: { label: string; value: number }[] = [
  { label: 'W1', value: 4 },
  { label: 'W2', value: 6 },
  { label: 'W3', value: 7 },
  { label: 'W4', value: 9 },
  { label: 'W5', value: 10 },
  { label: 'W6', value: 12 },
]

export const corridors: Corridor[] = [
  { name: 'N1 Midrand to Pretoria', level: 'high', note: 'Storm cells and heavy freight traffic' },
  { name: 'M1 Sandton to Johannesburg CBD', level: 'medium', note: 'Peak-hour congestion and harsh braking' },
  { name: 'R21 Kempton Park to Pretoria', level: 'medium', note: 'Frequent incidents near interchanges' },
  { name: 'N12 Johannesburg to Ekurhuleni', level: 'low', note: 'Steady flow, few alerts' },
]

/** Percent of alerts the driver acted on, 0 to 100. */
export function followRate(sent: number, followed: number): number {
  if (sent <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((followed / sent) * 100)))
}

export function totalDrivers(items: { drivers: number }[]): number {
  return items.reduce((sum, item) => sum + item.drivers, 0)
}

/** Alerts that were acted on and concerned a dangerous trip. */
export function highRiskTripsAvoided(stats: AlertStat[]): number {
  return stats.filter((stat) => HIGH_RISK_ALERTS.includes(stat.type)).reduce((sum, stat) => sum + stat.followed, 0)
}

export function estimatedClaimsAvoided(avoidedTrips: number): number {
  return Math.round(Math.max(0, avoidedTrips) * CLAIM_RATE)
}

export function claimsSaving(claims: number): number {
  return Math.max(0, claims) * AVERAGE_CLAIM_COST
}

/** What the discounts cost the insurer each month, using the average discount in each tier. */
export function monthlyDiscountCost(tiers: DiscountTier[], basePremium: number = BASE_MONTHLY_PREMIUM): number {
  return Math.round(tiers.reduce((sum, tier) => sum + tier.drivers * basePremium * (tier.percent / 100), 0))
}

export function monthlyPremiumBook(drivers: number, basePremium: number = BASE_MONTHLY_PREMIUM): number {
  return drivers * basePremium
}