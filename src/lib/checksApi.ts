import { NOT_CONFIGURED_MESSAGE, supabase } from './supabase'
import type { CheckRow } from '../data/checks'

const NETWORK_ERROR = 'Could not reach the server. Check your internet connection and try again.'

/** The signed-in driver's own advice checks. Row Level Security keeps it to their own rows. */
export async function loadAdvisorChecks(): Promise<{ rows: CheckRow[]; error: string }> {
  if (!supabase) return { rows: [], error: NOT_CONFIGURED_MESSAGE }
  try {
    const { data, error } = await supabase
      .from('advisor_checks')
      .select('id, scenario, departure, action, risk_score, followed, created_at')
      .order('created_at', { ascending: false })
      .limit(300)
    if (error) return { rows: [], error: error.message }
    return { rows: (data ?? []) as CheckRow[], error: '' }
  } catch {
    return { rows: [], error: NETWORK_ERROR }
  }
}