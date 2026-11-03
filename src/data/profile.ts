// Driver profile rules: personal details, the car, and the insurance the driver already has.
// Pure functions with no React or Supabase, so they are easy to test.

export type CoverType = 'comprehensive' | 'third-party-fire-theft' | 'third-party'

export type Profile = {
  fullName: string
  phone: string
  city: string
  vehicleMake: string
  vehicleModel: string
  vehicleYear: string // kept as text because it comes from a text box
  vehicleReg: string
  vehicleColour: string
  serviceOverdue: boolean
  insurer: string
  policyNumber: string
  coverType: CoverType | ''
  shareWithInsurer: boolean
  consentAt: string | null
}

// The shape of a row in the Supabase "profiles" table.
export type ProfileRow = {
  user_id: string
  email: string | null
  full_name: string | null
  phone: string | null
  city: string | null
  vehicle_make: string | null
  vehicle_model: string | null
  vehicle_year: number | null
  vehicle_reg: string | null
  vehicle_colour: string | null
  vehicle_service_overdue: boolean
  insurer: string | null
  policy_number: string | null
  cover_type: CoverType | null
  share_with_insurer: boolean
  consent_at: string | null
  updated_at?: string
}

export const COVER_TYPES: { value: CoverType; label: string }[] = [
  { value: 'comprehensive', label: 'Comprehensive' },
  { value: 'third-party-fire-theft', label: 'Third party, fire and theft' },
  { value: 'third-party', label: 'Third party only' },
]

// Suggestions only. The driver can type any insurer.
export const INSURER_SUGGESTIONS = [
  'MTN InsurTech (pilot)',
  'Outsurance',
  'Discovery Insure',
  'Santam',
  'Old Mutual Insure',
  'Hollard',
  'King Price',
]

export function coverLabel(value: CoverType | ''): string {
  return COVER_TYPES.find((item) => item.value === value)?.label ?? ''
}

export function emptyProfile(fullName: string = ''): Profile {
  return {
    fullName,
    phone: '',
    city: '',
    vehicleMake: '',
    vehicleModel: '',
    vehicleYear: '',
    vehicleReg: '',
    vehicleColour: '',
    serviceOverdue: false,
    insurer: '',
    policyNumber: '',
    coverType: '',
    shareWithInsurer: false,
    consentAt: null,
  }
}

export type ProfileField =
  | 'fullName'
  | 'phone'
  | 'city'
  | 'vehicleMake'
  | 'vehicleModel'
  | 'vehicleYear'
  | 'vehicleReg'
  | 'insurer'
  | 'policyNumber'
  | 'coverType'

export type ProfileErrors = Record<ProfileField, string>

export const FIELD_ORDER: ProfileField[] = [
  'fullName',
  'phone',
  'city',
  'vehicleMake',
  'vehicleModel',
  'vehicleYear',
  'vehicleReg',
  'insurer',
  'policyNumber',
  'coverType',
]

// What counts as "set up": the driver and the car. Insurance is optional.
const SETUP_FIELDS: ProfileField[] = [
  'fullName',
  'phone',
  'city',
  'vehicleMake',
  'vehicleModel',
  'vehicleYear',
  'vehicleReg',
]

const PHONE_PATTERN = /^(\+27|0)[0-9]{9}$/
const REG_PATTERN = /^[A-Za-z0-9 -]{3,12}$/
const POLICY_PATTERN = /^[A-Za-z0-9/-]{4,30}$/

export function validateProfile(profile: Profile, currentYear: number = new Date().getFullYear()): ProfileErrors {
  const errors: ProfileErrors = {
    fullName: '',
    phone: '',
    city: '',
    vehicleMake: '',
    vehicleModel: '',
    vehicleYear: '',
    vehicleReg: '',
    insurer: '',
    policyNumber: '',
    coverType: '',
  }

  if (profile.fullName.trim().length < 2) errors.fullName = 'Enter your full name.'

  const phone = profile.phone.replace(/\s+/g, '')
  if (phone === '') errors.phone = 'Enter your cell phone number.'
  else if (!PHONE_PATTERN.test(phone)) errors.phone = 'Use a South African number, like 082 123 4567.'

  if (profile.city.trim() === '') errors.city = 'Enter your city or town.'
  if (profile.vehicleMake.trim() === '') errors.vehicleMake = 'Enter the make, like Toyota.'
  if (profile.vehicleModel.trim() === '') errors.vehicleModel = 'Enter the model, like Corolla.'

  const year = Number(profile.vehicleYear)
  if (profile.vehicleYear.trim() === '') errors.vehicleYear = 'Enter the year of the car.'
  else if (!Number.isInteger(year) || year < 1980 || year > currentYear + 1) {
    errors.vehicleYear = `Enter a year between 1980 and ${currentYear + 1}.`
  }

  const reg = profile.vehicleReg.trim()
  if (reg === '') errors.vehicleReg = 'Enter the registration number.'
  else if (!REG_PATTERN.test(reg)) errors.vehicleReg = 'Use letters, numbers, spaces or dashes only (3 to 12 characters).'

  const hasInsurer = profile.insurer.trim() !== ''
  if (hasInsurer) {
    const policy = profile.policyNumber.trim()
    if (policy === '') errors.policyNumber = 'Enter your policy number.'
    else if (!POLICY_PATTERN.test(policy)) errors.policyNumber = 'Use letters, numbers, dashes or slashes only (4 to 30 characters).'
    if (profile.coverType === '') errors.coverType = 'Choose your type of cover.'
  } else if (profile.shareWithInsurer) {
    errors.insurer = 'Enter your insurer before you share your details with them.'
  }

  return errors
}

export function hasErrors(errors: ProfileErrors): boolean {
  return FIELD_ORDER.some((field) => errors[field] !== '')
}

/** True once the driver and the car are filled in correctly. Insurance is optional. */
export function isProfileComplete(profile: Profile, currentYear?: number): boolean {
  const errors = validateProfile(profile, currentYear)
  return SETUP_FIELDS.every((field) => errors[field] === '')
}

export function hasInsurance(profile: Profile): boolean {
  return profile.insurer.trim() !== ''
}

export function vehicleSummary(profile: Pick<Profile, 'vehicleYear' | 'vehicleMake' | 'vehicleModel' | 'vehicleReg'>): string {
  const car = [profile.vehicleYear, profile.vehicleMake, profile.vehicleModel].map((part) => part.trim()).filter(Boolean).join(' ')
  const reg = profile.vehicleReg.trim().toUpperCase()
  return [car, reg].filter(Boolean).join(' · ')
}

export function fromRow(row: ProfileRow | null, fallbackName: string = ''): Profile {
  if (!row) return emptyProfile(fallbackName)
  return {
    fullName: row.full_name ?? fallbackName,
    phone: row.phone ?? '',
    city: row.city ?? '',
    vehicleMake: row.vehicle_make ?? '',
    vehicleModel: row.vehicle_model ?? '',
    vehicleYear: row.vehicle_year === null ? '' : String(row.vehicle_year),
    vehicleReg: row.vehicle_reg ?? '',
    vehicleColour: row.vehicle_colour ?? '',
    serviceOverdue: row.vehicle_service_overdue,
    insurer: row.insurer ?? '',
    policyNumber: row.policy_number ?? '',
    coverType: row.cover_type ?? '',
    shareWithInsurer: row.share_with_insurer,
    consentAt: row.consent_at,
  }
}

/** Builds the row to save. Call validateProfile first: this assumes the profile is valid. */
export function toRow(profile: Profile, userId: string, email: string, nowIso: string): ProfileRow {
  const insurer = profile.insurer.trim()
  return {
    user_id: userId,
    email: email || null,
    full_name: profile.fullName.trim(),
    phone: profile.phone.replace(/\s+/g, ''),
    city: profile.city.trim(),
    vehicle_make: profile.vehicleMake.trim(),
    vehicle_model: profile.vehicleModel.trim(),
    vehicle_year: Number(profile.vehicleYear),
    vehicle_reg: profile.vehicleReg.trim().toUpperCase(),
    vehicle_colour: profile.vehicleColour.trim() || null,
    vehicle_service_overdue: profile.serviceOverdue,
    insurer: insurer || null,
    policy_number: insurer ? profile.policyNumber.trim() : null,
    cover_type: insurer && profile.coverType !== '' ? profile.coverType : null,
    share_with_insurer: profile.shareWithInsurer,
    // Keep the original consent time. Switching sharing off clears it.
    consent_at: profile.shareWithInsurer ? (profile.consentAt ?? nowIso) : null,
  }
}