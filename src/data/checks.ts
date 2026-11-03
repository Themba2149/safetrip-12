// Turns the driver's saved Trip Advisor checks into the dashboard numbers.
// Honest scope: this is a "safe-choice" score based on advice, not on driving sensors.
import type { Action, Departure, Scenario } from './advisor'

export type CheckRow = {
  id: string
  scenario: Scenario
  departure: Departure
  action: Action
  risk_score: number
  followed: boolean
  created_at: string
}

export type WeekBar = { label: string; score: number | null }

export type CheckSummary = {
  total: number // advice checks made
  decisions: number // checks where the advice was to wait, reroute or avoid
  followed: number // decisions where the driver chose the safer option
  score: number | null // % of decisions followed, null until there is a decision
  averageRisk: number | null
  weeks: WeekBar[] // oldest to newest, 6 weeks
}

const DAY_MS = 86_400_000
export const WEEK_LABELS = ['5w ago', '4w ago', '3w ago', '2w ago', 'Last wk', 'This wk']

/** Advice to travel needs no decision. Wait, reroute and avoid are the moments a safer choice is made. */
export function isDecision(action: Action): boolean {
  return action !== 'travel-now'
}

function percent(followed: number, decisions: number): number | null {
  return decisions === 0 ? null : Math.round((followed / decisions) * 100)
}

export function summarizeChecks(rows: CheckRow[], now: Date = new Date()): CheckSummary {
  const decisionRows = rows.filter((row) => isDecision(row.action))
  const followed = decisionRows.filter((row) => row.followed).length

  const buckets = WEEK_LABELS.map(() => ({ decisions: 0, followed: 0 }))
  for (const row of decisionRows) {
    const age = now.getTime() - new Date(row.created_at).getTime()
    if (Number.isNaN(age) || age < 0) continue
    const weeksAgo = Math.floor(age / (7 * DAY_MS))
    if (weeksAgo > 5) continue
    const bucket = buckets[5 - weeksAgo]
    bucket.decisions += 1
    if (row.followed) bucket.followed += 1
  }

  const averageRisk =
    rows.length === 0 ? null : Math.round(rows.reduce((sum, row) => sum + row.risk_score, 0) / rows.length)

  return {
    total: rows.length,
    decisions: decisionRows.length,
    followed,
    score: percent(followed, decisionRows.length),
    averageRisk,
    weeks: buckets.map((bucket, index) => ({
      label: WEEK_LABELS[index],
      score: percent(bucket.followed, bucket.decisions),
    })),
  }
}