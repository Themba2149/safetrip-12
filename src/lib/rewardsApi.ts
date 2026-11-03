import { NOT_CONFIGURED_MESSAGE, supabase } from './supabase'
import type { RewardEventRow } from '../data/wallet'

const NETWORK_ERROR = 'Could not reach the server. Check your internet connection and try again.'

export type PilotTotals = {
  drivers_with_profile: number
  drivers_sharing: number
  checks_total: number
  points_awarded: number
  alerts: { scenario: string; sent: number; followed: number }[]
  tiers: { percent: number; drivers: number }[]
}

/** The signed-in driver's own points history. Row Level Security keeps it to their own rows. */
export async function loadRewardEvents(): Promise<{ rows: RewardEventRow[]; error: string }> {
  if (!supabase) return { rows: [], error: NOT_CONFIGURED_MESSAGE }
  try {
    const { data, error } = await supabase
      .from('reward_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500)
    if (error) return { rows: [], error: error.message }
    return { rows: (data ?? []) as RewardEventRow[], error: '' }
  } catch {
    return { rows: [], error: NETWORK_ERROR }
  }
}

type NewCheck = {
  userId: string
  scenario: string
  departure: string
  action: string
  riskScore: number
  longTrip: boolean
}

/** Records a Trip Advisor check. Returns its id so the driver can claim the advice. */
export async function addAdvisorCheck(check: NewCheck): Promise<{ id: string | null; error: string }> {
  if (!supabase) return { id: null, error: NOT_CONFIGURED_MESSAGE }
  try {
    const { data, error } = await supabase
      .from('advisor_checks')
      .insert({
        user_id: check.userId,
        scenario: check.scenario,
        departure: check.departure,
        action: check.action,
        risk_score: check.riskScore,
        long_trip: check.longTrip,
      })
      .select('id')
      .single()
    if (error) return { id: null, error: error.message }
    return { id: (data as { id: string }).id, error: '' }
  } catch {
    return { id: null, error: NETWORK_ERROR }
  }
}

/** Claims the points for a check. The database works out the points and allows each check once. */
export async function claimAdvice(checkId: string): Promise<{ row: RewardEventRow | null; error: string }> {
  if (!supabase) return { row: null, error: NOT_CONFIGURED_MESSAGE }
  try {
    const { data, error } = await supabase.rpc('claim_advice', { p_check_id: checkId })
    if (error) return { row: null, error: error.message }
    return { row: data as RewardEventRow, error: '' }
  } catch {
    return { row: null, error: NETWORK_ERROR }
  }
}

/** Totals for the insurer view. The database refuses anyone without the insurer role. */
export async function loadPilotTotals(): Promise<{ totals: PilotTotals | null; error: string }> {
  if (!supabase) return { totals: null, error: NOT_CONFIGURED_MESSAGE }
  try {
    const { data, error } = await supabase.rpc('insurer_pilot_totals')
    if (error) return { totals: null, error: error.message }
    return { totals: data as PilotTotals, error: '' }
  } catch {
    return { totals: null, error: NETWORK_ERROR }
  }
}