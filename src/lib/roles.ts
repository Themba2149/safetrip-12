// Who may see the insurer view. The role lives in Supabase "app_metadata", which only an
// administrator can change. Never use "user_metadata" for roles: drivers can edit that themselves.

export function isInsurer(appMetadata: unknown): boolean {
  if (typeof appMetadata !== 'object' || appMetadata === null) return false
  return (appMetadata as { role?: unknown }).role === 'insurer'
}