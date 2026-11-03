import { useEffect, useState } from 'react'
import { coverLabel, hasInsurance, vehicleSummary } from '../data/profile'
import type { Profile } from '../data/profile'
import type { Page } from './DashboardLayout'
import {
  deviceUnlockSupported,
  disableDeviceUnlock,
  enableDeviceUnlock,
  isUnlockEnabled,
  verifyDeviceUnlock,
} from '../lib/deviceUnlock'

type Props = {
  profile: Profile | null
  userId: string
  label: string
  onNavigate: (page: Page) => void
}

export default function CoverCard({ profile, userId, label, onNavigate }: Props) {
  const [supported, setSupported] = useState<boolean | null>(null)
  const [enabled, setEnabled] = useState<boolean>(() => isUnlockEnabled(userId))
  const [unlocked, setUnlocked] = useState<boolean>(() => !isUnlockEnabled(userId))
  const [busy, setBusy] = useState<boolean>(false)
  const [message, setMessage] = useState<string>('')

  useEffect(() => {
    let cancelled = false
    deviceUnlockSupported().then((ok) => {
      if (!cancelled) setSupported(ok)
    })
    return () => {
      cancelled = true
    }
  }, [])

  async function handleUnlock() {
    setBusy(true)
    setMessage('')
    const error = await verifyDeviceUnlock(userId)
    setBusy(false)
    if (error) setMessage(error)
    else setUnlocked(true)
  }

  async function handleEnable() {
    setBusy(true)
    setMessage('')
    const error = await enableDeviceUnlock(userId, label)
    setBusy(false)
    if (error) {
      setMessage(error)
      return
    }
    setEnabled(true)
    setMessage('Unlock is on. Your cover details will ask for your face, fingerprint or device PIN each time you open the dashboard.')
  }

  function handleDisable() {
    disableDeviceUnlock(userId)
    setEnabled(false)
    setUnlocked(true)
    setMessage('Unlock is off on this device.')
  }

  const locked = enabled && !unlocked

  return (
    <section className="tile cover" aria-label="Your cover details">
      <h2>Your cover</h2>

      {profile === null && <p className="muted">Loading your details…</p>}

      {profile !== null && !hasInsurance(profile) && (
        <p className="muted">
          No insurance added yet.{' '}
          <button type="button" className="link-button" onClick={() => onNavigate('profile')}>
            Add your insurance
          </button>
        </p>
      )}

      {profile !== null && hasInsurance(profile) && locked && (
        <>
          <p className="muted">Your cover details are locked. Confirm it is you to see them.</p>
          <button type="button" className="primary" disabled={busy || supported === false} onClick={handleUnlock}>
            {busy ? 'Checking…' : 'Unlock with face or fingerprint'}
          </button>
          {supported === false && (
            <p className="note">This browser cannot do a face or fingerprint check. You can turn the unlock off below.</p>
          )}
          <button type="button" className="link-button left" onClick={handleDisable}>
            Turn the unlock off on this device
          </button>
        </>
      )}

      {profile !== null && hasInsurance(profile) && !locked && (
        <>
          <dl className="cover-list">
            <div>
              <dt>Insurer</dt>
              <dd>{profile.insurer}</dd>
            </div>
            <div>
              <dt>Policy number</dt>
              <dd>{profile.policyNumber || 'Not added'}</dd>
            </div>
            <div>
              <dt>Cover type</dt>
              <dd>{coverLabel(profile.coverType) || 'Not added'}</dd>
            </div>
            <div>
              <dt>Vehicle</dt>
              <dd>{vehicleSummary(profile) || 'Not added'}</dd>
            </div>
            <div>
              <dt>Shared with insurer</dt>
              <dd>{profile.shareWithInsurer ? 'Yes, you agreed' : 'No'}</dd>
            </div>
          </dl>

          {supported && !enabled && (
            <button type="button" className="secondary" disabled={busy} onClick={handleEnable}>
              {busy ? 'Setting up…' : 'Lock with face or fingerprint'}
            </button>
          )}
          {enabled && (
            <button type="button" className="link-button left" onClick={handleDisable}>
              Turn the unlock off
            </button>
          )}
        </>
      )}

      {message && (
        <p className="note" role="status">
          {message}
        </p>
      )}
      <p className="muted small-print">
        The check happens on your device. SafeTrip never receives or stores your face or fingerprint.
      </p>
    </section>
  )
}