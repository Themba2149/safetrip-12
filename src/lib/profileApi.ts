import { NOT_CONFIGURED_MESSAGE, supabase } from './supabase'
import type { ProfileRow } from '../data/profile'

const NETWORK_ERROR = 'Could not reach the server. Check your internet connection and try again.'

/** The signed-in driver's own profile. Row Level Security makes sure it can only be their own. */
export async function loadMyProfile(userId: string): Promise<{ row: ProfileRow | null; error: string }> {
  if (!supabase) return { row: null, error: NOT_CONFIGURED_MESSAGE }
  try {
    const { data, error } = await supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle()
    if (error) return { row: null, error: error.message }
    return { row: data as ProfileRow | null, error: '' }
  } catch {
    return { row: null, error: NETWORK_ERROR }
  }
}

export async function saveMyProfile(row: ProfileRow): Promise<{ row: ProfileRow | null; error: string }> {
  if (!supabase) return { row: null, error: NOT_CONFIGURED_MESSAGE }
  try {
    const { data, error } = await supabase.from('profiles').upsert(row, { onConflict: 'user_id' }).select().single()
    if (error) {
      // 23505 = a unique rule was broken: this registration already belongs to another driver.
      if (error.code === '23505') {
        return { row: null, error: 'This registration number is already registered to another driver. Check it and try again.' }
      }
      return { row: null, error: error.message }
    }
    return { row: data as ProfileRow, error: '' }
  } catch {
    return { row: null, error: NETWORK_ERROR }
  }
}

/** Kept for reference. Insurers can no longer list drivers: they search by registration instead. */
export async function loadSharedProfiles(): Promise<{ rows: ProfileRow[]; error: string }> {
  if (!supabase) return { rows: [], error: NOT_CONFIGURED_MESSAGE }
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('share_with_insurer', true)
      .order('updated_at', { ascending: false })
      .limit(200)
    if (error) return { rows: [], error: error.message }
    return { rows: (data ?? []) as ProfileRow[], error: '' }
  } catch {
    return { rows: [], error: NETWORK_ERROR }
  }
}