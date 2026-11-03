import { NOT_CONFIGURED_MESSAGE, supabase } from './supabase'
import type { ProfileRow } from '../data/profile'

const NETWORK_ERROR = 'Could not reach the server. Check your internet connection and try again.'

/** Finds one driver by registration number. The database refuses anyone without the insurer role. */
export async function findDriverByRegistration(
  registration: string,
): Promise<{ row: ProfileRow | null; error: string }> {
  if (!supabase) return { row: null, error: NOT_CONFIGURED_MESSAGE }
  try {
    const { data, error } = await supabase.rpc('find_driver_by_registration', { p_registration: registration })
    if (error) return { row: null, error: error.message }
    return { row: (data ?? null) as ProfileRow | null, error: '' }
  } catch {
    return { row: null, error: NETWORK_ERROR }
  }
}