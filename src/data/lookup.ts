// Registration-number look-up rules for the insurer portal. Pure functions, easy to test.
// The database applies the same cleaning (uppercase letters and digits only) so both sides always agree.

/** "ca 123-456" becomes "CA123456". */
export function normalizeRegistration(text: string): string {
  return text.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

/** Returns an error message, or an empty string when the registration can be searched. */
export function validateRegistrationSearch(text: string): string {
  const raw = text.trim()
  if (raw === '') return 'Enter the vehicle registration number.'
  if (!/^[A-Za-z0-9 -]+$/.test(raw)) return 'Use letters, numbers, spaces or dashes only.'
  const clean = normalizeRegistration(raw)
  if (clean.length < 3 || clean.length > 12) return 'Enter a valid registration number (3 to 12 letters and numbers).'
  return ''
}