import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { coverLabel, fromRow, vehicleSummary } from '../data/profile'
import type { ProfileRow } from '../data/profile'
import { normalizeRegistration, validateRegistrationSearch } from '../data/lookup'
import { findDriverByRegistration } from '../lib/driverLookupApi'

type Outcome = { searched: string; row: ProfileRow | null }

export default function DriverLookup() {
  const [registration, setRegistration] = useState<string>('')
  const [fieldError, setFieldError] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [searching, setSearching] = useState<boolean>(false)
  const [outcome, setOutcome] = useState<Outcome | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    const problem = validateRegistrationSearch(registration)
    setFieldError(problem)
    if (problem) {
      document.getElementById('lookup-reg')?.focus()
      return
    }

    setSearching(true)
    setOutcome(null)
    const found = await findDriverByRegistration(registration)
    setSearching(false)
    if (found.error) {
      setError(found.error)
      return
    }
    setOutcome({ searched: normalizeRegistration(registration), row: found.row })
  }

  function clear() {
    setRegistration('')
    setOutcome(null)
    setError('')
    setFieldError('')
  }

  const driver = outcome?.row ? fromRow(outcome.row) : null

  return (
    <section className="tile" aria-label="Find a driver">
      <h2>Find a driver</h2>
      <p className="muted">
        Enter the vehicle registration number to see that driver's shared details. Drivers cannot be browsed.
      </p>

      <form className="lookup-form" noValidate onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="lookup-reg">Registration number</label>
          <input
            id="lookup-reg"
            type="text"
            autoComplete="off"
            placeholder="For example CA 123-456"
            value={registration}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setRegistration(event.target.value)}
            aria-invalid={fieldError ? 'true' : 'false'}
            aria-describedby={fieldError ? 'lookup-reg-error' : undefined}
          />
          {fieldError && (
            <p id="lookup-reg-error" className="error">
              {fieldError}
            </p>
          )}
        </div>
        <button type="submit" className="primary" disabled={searching}>
          {searching ? 'Searching…' : 'Look up driver'}
        </button>
      </form>

      {error && (
        <p className="error-box" role="alert">
          {error}
        </p>
      )}

      {outcome && !driver && (
        <p className="note" role="status">
          No driver found for {outcome.searched}. The registration may be wrong, the driver may not be registered, or
          they have not agreed to share, or are not insured with your company.
        </p>
      )}

      {driver && outcome?.row && (
        <div className="driver-card" role="status">
          <div className="driver-card-head">
            <div>
              <h3>{driver.fullName || 'Driver'}</h3>
              <span className="muted">{vehicleSummary(driver)}</span>
            </div>
            <span className={driver.serviceOverdue ? 'lvl medium' : 'lvl low'}>
              {driver.serviceOverdue ? 'Service overdue' : 'Service ok'}
            </span>
          </div>
          <dl className="cover-list">
            <div>
              <dt>Insurer</dt>
              <dd>{driver.insurer || 'No insurer listed'}</dd>
            </div>
            <div>
              <dt>Policy number</dt>
              <dd>{driver.policyNumber || 'Not added'}</dd>
            </div>
            <div>
              <dt>Cover type</dt>
              <dd>{coverLabel(driver.coverType) || 'Not added'}</dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd>{driver.phone || 'Not added'}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{outcome.row.email || 'Not added'}</dd>
            </div>
            <div>
              <dt>City</dt>
              <dd>{driver.city || 'Not added'}</dd>
            </div>
            <div>
              <dt>Agreed to share</dt>
              <dd>
                {driver.consentAt ? new Date(driver.consentAt).toLocaleDateString('en-ZA') : 'Yes'}
              </dd>
            </div>
          </dl>
          <button type="button" className="secondary small" onClick={clear}>
            Search another driver
          </button>
        </div>
      )}

      <p className="muted small-print">
        Only drivers who agreed to share can be found, and a driver can turn sharing off at any time. Every look-up is
        recorded against your account (POPIA).
      </p>
    </section>
  )
}