// Rewards wallet rules. Pure functions, no React. Sample history until Phase 8 stores the real one.
import { MAX_DISCOUNT_PERCENT, POINTS_PER_PERCENT, discountPercent } from './mockDriver.ts'

export type LedgerEntry = { id: string; when: string; reason: string; points: number }
export type EarnRule = { behaviour: string; points: string; tip: string }

// The rewards table from the pitch deck.
export const EARN_RULES: EarnRule[] = [
  { behaviour: 'Safe arrival', points: '+5', tip: 'Finish a trip with no hard-braking alerts.' },
  { behaviour: 'Safer route or option', points: '+5 to +40', tip: 'Wait, reroute or avoid when Trip Advisor warns you.' },
  { behaviour: 'Vehicle maintenance', points: '+15 to +25', tip: 'Book and complete an overdue service.' },
  { behaviour: 'Hail avoidance', points: '+20', tip: 'Take cover and leave after a hail warning passes.' },
  { behaviour: 'Break on a long trip', points: '+15', tip: 'Stop for 15 minutes every 2 hours.' },
]

export const sampleLedger: LedgerEntry[] = [
  { id: 's1', when: 'Today', reason: 'Waited out bad weather', points: 10 },
  { id: 's2', when: 'Today', reason: 'Safe arrival', points: 5 },
  { id: 's3', when: 'Yesterday', reason: 'Avoided travel during a hail warning', points: 20 },
  { id: 's4', when: 'Mon', reason: 'Took a safer route', points: 15 },
  { id: 's5', when: 'Sun', reason: 'Break on a long trip', points: 15 },
]

// Points earned before the entries above, so the sample balance stays at 1 240.
export const SAMPLE_OPENING_BALANCE = 1175

export function balanceOf(opening: number, entries: LedgerEntry[]): number {
  return opening + entries.reduce((sum, entry) => sum + entry.points, 0)
}

export function makeEntry(reason: string, points: number, sequence: number): LedgerEntry {
  return { id: `e${sequence}`, when: 'Just now', reason, points }
}

/** 0 to 100: how far through the current 100 points the driver is. Null once the 15% cap is reached. */
export function progressToNext(points: number): number | null {
  if (discountPercent(points) >= MAX_DISCOUNT_PERCENT) return null
  return Math.max(0, points) % POINTS_PER_PERCENT
}

/** 0 to 100: how close the driver is to the maximum discount. */
export function progressToCap(points: number): number {
  const capPoints = MAX_DISCOUNT_PERCENT * POINTS_PER_PERCENT
  return Math.max(0, Math.min(100, Math.round((points / capPoints) * 100)))
}


// ---------- Saved rewards (Phase 8, part 2) ----------

// A row in the Supabase "reward_events" table.
export type RewardEventRow = { id: string; user_id: string; reason: string; points: number; created_at: string }

/** "Just now", "Today", "Yesterday", a weekday within a week, otherwise a short date. */
export function formatWhen(iso: string, now: Date = new Date()): string {
  const then = new Date(iso)
  if (Number.isNaN(then.getTime())) return ''
  if (now.getTime() - then.getTime() < 60_000) return 'Just now'
  const startOfDay = (date: Date): number => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  const days = Math.round((startOfDay(now) - startOfDay(then)) / 86_400_000)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return then.toLocaleDateString('en-ZA', { weekday: 'short' })
  return then.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })
}

export function entryFromRow(
  row: Pick<RewardEventRow, 'id' | 'reason' | 'points' | 'created_at'>,
  now: Date = new Date(),
): LedgerEntry {
  return { id: row.id, when: formatWhen(row.created_at, now), reason: row.reason, points: row.points }
}