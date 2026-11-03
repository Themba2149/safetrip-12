import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import type { User } from '@supabase/supabase-js'
import DashboardLayout from '../components/DashboardLayout'
import type { Page } from '../components/DashboardLayout'
import TextField from '../components/TextField'
import { saveMyProfile } from '../lib/profileApi'
import {
  COVER_TYPES,
  FIELD_ORDER,
  INSURER_SUGGESTIONS,
  coverLabel,
  fromRow,
  hasErrors,
  hasInsurance,
  toRow,
  validateProfile,
  vehicleSummary,
} from '../data/profile'
import type { CoverType, Profile, ProfileField } from '../data/profile'

type Status = 'loading' | 'ready' | 'error'

type Props = {
  user: User
  status: Status
  profile: Profile | null
  onSaved: (profile: Profile) => void
  onNavigate: (page: Page) => void
}

type FormProps = {
  user: User
  profile: Profile
  onSaved: (profile: Profile) => void
}

function ProfileForm({ user, profile, onSaved }: FormProps) {
  const [draft, setDraft] = useState<Profile>(profile)
  const [submitted, setSubmitted] = useState<boolean>(false)
  const [saving, setSaving] = useState<boolean>(false)
  const [saved, setSaved] = useState<boolean>(false)
  const [serverError, setServerError] = useState<string>('')

  const errors = validateProfile(draft)
  const shown = (field: ProfileField): string => (submitted ? errors[field] : '')

  function update<K extends keyof Profile>(key: K, value: Profile[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
    setSaved(false)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitted(true)
    setServerError('')
    setSaved(false)

    const firstBad = FIELD_ORDER.find((field) => errors[field] !== '')
    if (firstBad) {
      document.getElementById(firstBad)?.focus()
      return
    }

    setSaving(true)
    const result = await saveMyProfile(toRow(draft, user.id, user.email ?? '', new Date().toISOString()))
    setSaving(false)

    if (result.error || !result.row) {
      setServerError(result.error || 'We could not save your profile. Try again.')
      return
    }
    const savedProfile = fromRow(result.row)
    setDraft(savedProfile)
    onSaved(savedProfile)
    setSaved(true)
  }

  return (
    <form className="profile-form" noValidate onSubmit={handleSubmit}>
      <section className="tile" aria-label="Your insurance">
        <h2>Your insurance</h2>
        {hasInsurance(profile) ? (
          <>
            <p className="big small-big">{profile.insurer}</p>
            <p className="muted">
              {coverLabel(profile.coverType)} · Policy {profile.policyNumber}
            </p>
          </>
        ) : (
          <p className="muted">No insurer added yet. Add your insurer and policy below.</p>
        )}
      </section>

      <section className="tile" aria-label="About you">
        <h2>About you</h2>
        <div className="form-grid">
          <div className="span-2">
            <TextField
              id="fullName"
              label="Full name"
              value={draft.fullName}
              onChange={(value) => update('fullName', value)}
              error={shown('fullName')}
              autoComplete="name"
            />
          </div>
          <TextField
            id="phone"
            label="Cell phone number"
            type="tel"
            value={draft.phone}
            onChange={(value) => update('phone', value)}
            error={shown('phone')}
            placeholder="082 123 4567"
            autoComplete="tel"
            inputMode="tel"
          />
          <TextField
            id="city"
            label="City or town"
            value={draft.city}
            onChange={(value) => update('city', value)}
            error={shown('city')}
            placeholder="Johannesburg"
            autoComplete="address-level2"
          />
        </div>
      </section>

      <section className="tile" aria-label="Your car">
        <h2>Your car</h2>
        <div className="form-grid">
          <TextField
            id="vehicleMake"
            label="Make"
            value={draft.vehicleMake}
            onChange={(value) => update('vehicleMake', value)}
            error={shown('vehicleMake')}
            placeholder="Toyota"
          />
          <TextField
            id="vehicleModel"
            label="Model"
            value={draft.vehicleModel}
            onChange={(value) => update('vehicleModel', value)}
            error={shown('vehicleModel')}
            placeholder="Corolla"
          />
          <TextField
            id="vehicleYear"
            label="Year"
            value={draft.vehicleYear}
            onChange={(value) => update('vehicleYear', value)}
            error={shown('vehicleYear')}
            placeholder="2019"
            inputMode="numeric"
            maxLength={4}
          />
          <TextField
            id="vehicleReg"
            label="Registration number"
            value={draft.vehicleReg}
            onChange={(value) => update('vehicleReg', value)}
            error={shown('vehicleReg')}
            placeholder="CA 123-456"
            maxLength={12}
          />
          <div className="span-2">
            <TextField
              id="vehicleColour"
              label="Colour (optional)"
              value={draft.vehicleColour}
              onChange={(value) => update('vehicleColour', value)}
              placeholder="White"
            />
          </div>
          <div className="field span-2">
            <label className="consent" htmlFor="serviceOverdue">
              <input
                id="serviceOverdue"
                type="checkbox"
                checked={draft.serviceOverdue}
                onChange={(event: ChangeEvent<HTMLInputElement>) => update('serviceOverdue', event.target.checked)}
              />
              <span>My car service is overdue</span>
            </label>
          </div>
        </div>
      </section>

      <section className="tile" aria-label="Insurance details">
        <h2>Insurance details</h2>
        <p className="muted section-note">
          Leave the insurer empty if you are not insured yet. Do not enter your ID number or banking details here.
        </p>
        <div className="form-grid">
          <TextField
            id="insurer"
            label="Insurer"
            value={draft.insurer}
            onChange={(value) => update('insurer', value)}
            error={shown('insurer')}
            placeholder="Start typing or pick one"
            list="insurer-list"
          />
          <datalist id="insurer-list">
            {INSURER_SUGGESTIONS.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>

          <div className="field">
            <label htmlFor="coverType">Type of cover</label>
            <select
              id="coverType"
              value={draft.coverType}
              onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                update('coverType', event.target.value as CoverType | '')
              }
              aria-invalid={shown('coverType') ? 'true' : 'false'}
              aria-describedby={shown('coverType') ? 'coverType-error' : undefined}
            >
              <option value="">Choose…</option>
              {COVER_TYPES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            {shown('coverType') && (
              <p id="coverType-error" className="error">
                {shown('coverType')}
              </p>
            )}
          </div>

          <div className="span-2">
            <TextField
              id="policyNumber"
              label="Policy number"
              value={draft.policyNumber}
              onChange={(value) => update('policyNumber', value)}
              error={shown('policyNumber')}
              placeholder="POL-123456"
            />
          </div>

          <div className="field span-2">
            <label className="consent" htmlFor="shareWithInsurer">
              <input
                id="shareWithInsurer"
                type="checkbox"
                checked={draft.shareWithInsurer}
                onChange={(event: ChangeEvent<HTMLInputElement>) => update('shareWithInsurer', event.target.checked)}
              />
              <span>
                I agree to share my vehicle and policy details with my insurer so they can support my cover. I can
                turn this off at any time.
              </span>
            </label>
          </div>
        </div>
      </section>

      {serverError && (
        <p className="error-box" role="alert">
          {serverError}
        </p>
      )}
      {saved && (
        <p className="notice" role="status">
          Profile saved. {vehicleSummary(draft)}
        </p>
      )}
      {submitted && hasErrors(errors) && (
        <p className="error-box" role="alert">
          Please fix the highlighted fields.
        </p>
      )}

      <button type="submit" className="primary" disabled={saving}>
        {saving ? 'Saving…' : 'Save profile'}
      </button>
    </form>
  )
}

export default function ProfilePage({ user, status, profile, onSaved, onNavigate }: Props) {
  const meta = user.user_metadata as { full_name?: string } | undefined
  const fullName = meta?.full_name || user.email || 'Driver'

  return (
    <DashboardLayout name={fullName} current="profile" onNavigate={onNavigate}>
      <div className="dash-title">
        <h1>Your profile</h1>
        <p>Tell us about you, your car and your insurance.</p>
      </div>

      {status === 'loading' && <p className="muted">Loading your profile…</p>}
      {status === 'error' && (
        <p className="error-box" role="alert">
          We could not load your profile. Check your connection, then refresh the page.
        </p>
      )}
      {status === 'ready' && profile && <ProfileForm user={user} profile={profile} onSaved={onSaved} />}
    </DashboardLayout>
  )
}