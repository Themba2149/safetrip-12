// Form checks for the SafeTrip pages. Pure functions with no React in them.

// ---------- Login (Phase 1) ----------
export type LoginFields = { email: string; password: string }
export type LoginErrors = { email: string; password: string }

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function validateEmail(value: string | null | undefined): string {
  const email = String(value ?? '').trim()
  if (email === '') return 'Enter your email address.'
  if (!EMAIL_PATTERN.test(email)) return 'Enter a valid email address, like name@example.com.'
  return ''
}

export function validatePassword(value: string | null | undefined): string {
  if (String(value ?? '') === '') return 'Enter your password.'
  return ''
}

export function validateLogin({ email, password }: LoginFields): LoginErrors {
  return { email: validateEmail(email), password: validatePassword(password) }
}

// ---------- Registration (Phase 2) ----------
export const MIN_PASSWORD_LENGTH = 8

export type RegistrationField = 'fullName' | 'email' | 'password' | 'confirm' | 'agree'
export type RegistrationFields = {
  fullName: string
  email: string
  password: string
  confirm: string
  agreed: boolean
}
export type RegistrationErrors = Record<RegistrationField, string>

export function validateFullName(value: string | null | undefined): string {
  const name = String(value ?? '').trim()
  if (name.length < 2) return 'Enter your full name.'
  return ''
}

export function validateNewPassword(value: string | null | undefined): string {
  const password = String(value ?? '')
  if (password === '') return 'Create a password.'
  if (password.length < MIN_PASSWORD_LENGTH) return `Use at least ${MIN_PASSWORD_LENGTH} characters.`
  if (!/[A-Za-z]/.test(password)) return 'Include at least one letter.'
  if (!/[0-9]/.test(password)) return 'Include at least one number.'
  return ''
}

export function validateConfirm(password: string, confirm: string): string {
  if (confirm === '') return 'Re-enter your password.'
  if (confirm !== password) return 'The passwords do not match.'
  return ''
}

export function validateConsent(agreed: boolean): string {
  return agreed ? '' : 'You must agree to continue.'
}

export type PasswordRule = { label: string; met: boolean }

/** The live checklist shown under the password box. */
export function passwordRules(password: string): PasswordRule[] {
  return [
    { label: `At least ${MIN_PASSWORD_LENGTH} characters`, met: password.length >= MIN_PASSWORD_LENGTH },
    { label: 'A letter', met: /[A-Za-z]/.test(password) },
    { label: 'A number', met: /[0-9]/.test(password) },
  ]
}

export function validateRegistration(fields: RegistrationFields): RegistrationErrors {
  return {
    fullName: validateFullName(fields.fullName),
    email: validateEmail(fields.email),
    password: validateNewPassword(fields.password),
    confirm: validateConfirm(fields.password, fields.confirm),
    agree: validateConsent(fields.agreed),
  }
}