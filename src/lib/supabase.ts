import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(url && anonKey && !url.includes('YOUR-PROJECT'))

// null when the keys are missing, so the pages can show a clear message instead of crashing.
export const supabase = isSupabaseConfigured ? createClient(url as string, anonKey as string) : null

// Where the link in the verification email sends the driver back to.
export const emailRedirectTo = `${window.location.origin}/?verified=1`

export const NOT_CONFIGURED_MESSAGE =
  'Supabase is not connected yet. Add your project keys to .env.local (see the README), then restart npm run dev.'

export function friendlyAuthError(error: { message: string; status?: number }): string {
  if (error.status === 429 || /rate limit/i.test(error.message)) {
    return 'Too many emails were sent. Wait a few minutes and try again.'
  }
  return error.message
}