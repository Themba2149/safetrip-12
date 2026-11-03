// Driver onboarding: a seven-step application for cover. Submitting asks the insurer to verify and decide.
// It never activates cover by itself.
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import type { Page } from '../components/DashboardLayout'
import StepProgress from '../components/StepProgress'
import {
  COVER_OPTIONS,
  DOC_KINDS,
  EMPTY_DRAFT,
  LICENCE_CODES,
  STATUS_TEXT,
  STEPS,
  USAGE_OPTIONS,
  firstIncompleteStep,
  hasErrors,
  isEditable,
  maskId,
  rowToDraft,
  validateStep,
} from '../data/onboarding'
import type { ApplicationRow, DocKind, Errors, OnboardingDraft, YesNo } from '../data/onboarding'
import {
  documentLink,
  loadApplication,
  removeDocument,
  saveApplication,
  submitApplication,
  uploadDocument,
} from '../lib/onboardingApi'
import type { DocumentRow } from '../lib/onboardingApi'

type Props = { user: User; onNavigate: (page: Page) => void }

type TextKey = {
  [K in keyof OnboardingDraft]: OnboardingDraft[K] extends string ? K : never
}[keyof OnboardingDraft]

type FieldProps = {
  id: TextKey
  label: string
  value: string
  error?: string
  hint?: string
  type?: string
  inputMode?: 'text' | 'numeric' | 'tel' | 'email'
  autoComplete?: string
  maxLength?: number
  onChange: (id: TextKey, value: string) => void
}

function Field({ id, label, value, error, hint, type = 'text', inputMode, autoComplete, maxLength, onChange }: FieldProps) {
  return (
    <div className={`ob-field${error ? ' ob-field-error' : ''}`}>
      <label htmlFor={`ob-${id}`}>{label}</label>
      <input
        id={`ob-${id}`}
        name={id}
        type={type}
        value={value}
        inputMode={inputMode}
        autoComplete={autoComplete}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `ob-${id}-err` : hint ? `ob-${id}-hint` : undefined}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(id, event.target.value)}
      />
      {hint && !error ? <p className="ob-hint" id={`ob-${id}-hint`}>{hint}</p> : null}
      {error ? <p className="ob-error" id={`ob-${id}-err`} role="alert">{error}</p> : null}
    </div>
  )
}

type YesNoProps = { id: 'licenceSuspended' | 'insuranceDeclined'; legend: string; value: YesNo; error?: string; onChange: (id: 'licenceSuspended' | 'insuranceDeclined', value: YesNo) => void }

function YesNoField({ id, legend, value, error, onChange }: YesNoProps) {
  return (
    <fieldset className={`ob-field ob-radios${error ? ' ob-field-error' : ''}`}>
      <legend>{legend}</legend>
      {(['no', 'yes'] as const).map((option) => (
        <label key={option} className="ob-radio">
          <input type="radio" name={id} checked={value === option} onChange={() => onChange(id, option)} />
          {option === 'yes' ? 'Yes' : 'No'}
        </label>
      ))}
      {error ? <p className="ob-error" role="alert">{error}</p> : null}
    </fieldset>
  )
}

function Check({ checked, error, onChange, children }: { checked: boolean; error?: string; onChange: (value: boolean) => void; children: ReactNode }) {
  return (
    <div className={`ob-field${error ? ' ob-field-error' : ''}`}>
      <label className="ob-check">
        <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
        <span>{children}</span>
      </label>
      {error ? <p className="ob-error" role="alert">{error}</p> : null}
    </div>
  )
}

function dateText(value: string): string {
  return value ? value : '—'
}

export default function OnboardingPage({ user, onNavigate }: Props) {
  const meta = user.user_metadata as { full_name?: string } | undefined
  const fallback = useMemo(() => ({ fullName: meta?.full_name ?? '', email: user.email ?? '' }), [meta?.full_name, user.email])

  const [loading, setLoading] = useState<boolean>(true)
  const [loadError, setLoadError] = useState<string>('')
  const [row, setRow] = useState<ApplicationRow | null>(null)
  const [docs, setDocs] = useState<DocumentRow[]>([])
  const [draft, setDraft] = useState<OnboardingDraft>({ ...EMPTY_DRAFT, ...fallback, fullName: fallback.fullName, email: fallback.email })
  const [step, setStep] = useState<number>(0)
  const [tried, setTried] = useState<boolean>(false)
  const [busy, setBusy] = useState<boolean>(false)
  const [notice, setNotice] = useState<string>('')
  const [problem, setProblem] = useState<string>('')
  const [uploading, setUploading] = useState<DocKind | ''>('')

  useEffect(() => {
    let cancelled = false
    void loadApplication().then((result) => {
      if (cancelled) return
      setRow(result.row)
      setDocs(result.docs)
      setLoadError(result.error)
      setDraft(rowToDraft(result.row, fallback))
      setStep(result.row ? Math.min(result.row.step, STEPS.length - 1) : 0)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [fallback])

  const docKinds = useMemo(() => Array.from(new Set(docs.map((doc) => doc.kind))), [docs])
  const ctx = useMemo(() => ({ now: new Date(), docs: docKinds }), [docKinds])
  const stepKey = STEPS[step].key
  const errors: Errors = tried ? validateStep(stepKey, draft, ctx) : {}
  const editable = row === null || isEditable(row.status)

  const reachable = useMemo(() => {
    const first = firstIncompleteStep(draft, ctx)
    return first === null ? STEPS.length - 1 : first
  }, [draft, ctx])

  const setText = useCallback((id: TextKey, value: string) => {
    setDraft((current) => ({ ...current, [id]: value }))
  }, [])

  function setYesNo(id: 'licenceSuspended' | 'insuranceDeclined', value: YesNo) {
    setDraft((current) => ({ ...current, [id]: value }))
  }

  function setFlag(id: 'consentTerms' | 'consentProcessing' | 'consentVerification' | 'declarationTrue', value: boolean) {
    setDraft((current) => ({ ...current, [id]: value }))
  }

  /** Saves, then optionally moves. Returns the saved row, or null when saving failed (the message is shown). */
  async function save(toStep: number): Promise<ApplicationRow | null> {
    setBusy(true)
    setProblem('')
    const result = await saveApplication(user.id, row, draft, toStep)
    setBusy(false)
    if (result.error || !result.row) {
      setProblem(result.error)
      return null
    }
    setRow(result.row)
    return result.row
  }

  async function handleNext() {
    setNotice('')
    if (hasErrors(validateStep(stepKey, draft, ctx))) {
      setTried(true)
      return
    }
    const next = Math.min(step + 1, STEPS.length - 1)
    if (await save(next)) {
      setStep(next)
      setTried(false)
      window.scrollTo({ top: 0 })
    }
  }

  function handleBack() {
    setNotice('')
    setProblem('')
    setTried(false)
    setStep((current) => Math.max(0, current - 1))
  }

  async function handleSaveLater() {
    setNotice('')
    if (await save(step)) setNotice('Saved. You can come back any time and carry on from here.')
  }

  function goTo(index: number) {
    setNotice('')
    setProblem('')
    setTried(false)
    setStep(index)
    window.scrollTo({ top: 0 })
  }

  async function handleSubmit() {
    setNotice('')
    const first = firstIncompleteStep(draft, ctx)
    if (first !== null) {
      setStep(first)
      setTried(true)
      setProblem(`Step ${first + 1} (${STEPS[first].label}) still needs attention before you can submit.`)
      return
    }
    const saved = await save(step)
    if (!saved) return
    setBusy(true)
    const result = await submitApplication(saved.id)
    setBusy(false)
    if (result.error || !result.row) {
      setProblem(result.error)
      return
    }
    setRow(result.row)
    window.scrollTo({ top: 0 })
  }

  async function handleUpload(kind: DocKind, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = '' // lets the same file be chosen again
    if (!file) return
    setProblem('')
    setNotice('')
    setUploading(kind)
    // The document needs an application to belong to, so save the answers first if nothing exists yet.
    const owner = row ?? (await save(step))
    if (!owner) {
      setUploading('')
      return
    }
    const result = await uploadDocument(user.id, owner.id, kind, file)
    setUploading('')
    if (result.error || !result.doc) {
      setProblem(result.error)
      return
    }
    const added = result.doc
    // A newer upload replaces the older one of the same kind, so the insurer sees only the latest.
    const older = docs.filter((doc) => doc.kind === kind)
    setDocs((current) => [added, ...current.filter((doc) => doc.kind !== kind)])
    for (const doc of older) await removeDocument(doc)
  }

  async function handleView(doc: DocumentRow) {
    const result = await documentLink(doc)
    if (result.error) setProblem(result.error)
    else window.open(result.url, '_blank', 'noopener,noreferrer')
  }

  async function handleRemove(doc: DocumentRow) {
    const message = await removeDocument(doc)
    if (message) setProblem(message)
    else setDocs((current) => current.filter((item) => item.id !== doc.id))
  }

  if (loading) return <p className="ob-loading">Loading your application…</p>

  const fieldProps = (id: TextKey, label: string, extra: Partial<FieldProps> = {}): FieldProps => ({
    id,
    label,
    value: draft[id],
    error: errors[id],
    onChange: setText,
    ...extra,
  })

  // ---------- After submission: status view ----------
  if (row && !editable) {
    const text = STATUS_TEXT[row.status]
    return (
      <section className="ob-page" aria-labelledby="ob-title">
        <h1 id="ob-title">Your application</h1>
        <div className={`ob-status ob-status-${row.status}`} role="status">
          <p className="ob-status-label">{text.label}</p>
          <p>{text.detail}</p>
          {row.insurer_note ? <p className="ob-note"><strong>Note from the insurer:</strong> {row.insurer_note}</p> : null}
        </div>
        <p className="ob-callout">
          Your cover is not active until the insurer confirms it. The dashboard, Trip Advisor and rewards wallet work as before while you wait.
        </p>
        <Summary draft={draft} docs={docs} onEdit={null} />
        {problem ? <p className="ob-error" role="alert">{problem}</p> : null}
        <div className="ob-actions">
          <button type="button" className="ob-secondary" onClick={() => onNavigate('overview')}>Back to overview</button>
        </div>
      </section>
    )
  }

  return (
    <section className="ob-page" aria-labelledby="ob-title">
      <h1 id="ob-title">Apply for cover</h1>
      <p className="ob-intro">
        Seven short steps. Submitting sends your details to the insurer to verify and decide. Registering with SafeTrip does not give you cover on its own.
      </p>
      {row?.status === 'needs_info' ? (
        <div className="ob-status ob-status-needs_info" role="status">
          <p className="ob-status-label">{STATUS_TEXT.needs_info.label}</p>
          {row.insurer_note ? <p className="ob-note"><strong>Note from the insurer:</strong> {row.insurer_note}</p> : <p>{STATUS_TEXT.needs_info.detail}</p>}
        </div>
      ) : null}
      {loadError ? <p className="ob-error" role="alert">{loadError}</p> : null}

      <StepProgress current={step} reachable={reachable} onGo={goTo} />

      <form className="ob-form" noValidate onSubmit={(event) => event.preventDefault()}>
        {stepKey === 'personal' ? (
          <>
            <h2>About you</h2>
            <Field {...fieldProps('fullName', 'Full name', { autoComplete: 'name', hint: 'As it appears on your ID.' })} />
            <Field {...fieldProps('idNumber', 'South African ID number', { inputMode: 'numeric', maxLength: 17, hint: '13 digits.' })} />
            <Field {...fieldProps('dateOfBirth', 'Date of birth', { type: 'date', autoComplete: 'bday' })} />
            <Field {...fieldProps('phone', 'Cellphone number', { type: 'tel', inputMode: 'tel', autoComplete: 'tel', hint: 'For example 082 123 4567.' })} />
            <Field {...fieldProps('email', 'Email address', { type: 'email', inputMode: 'email', autoComplete: 'email' })} />
            <Field {...fieldProps('addressLine', 'Street address', { autoComplete: 'address-line1' })} />
            <Field {...fieldProps('suburb', 'Suburb')} />
            <Field {...fieldProps('city', 'City or town', { autoComplete: 'address-level2' })} />
            <Field {...fieldProps('postalCode', 'Postal code', { inputMode: 'numeric', maxLength: 4, autoComplete: 'postal-code' })} />
          </>
        ) : null}

        {stepKey === 'licence' ? (
          <>
            <h2>Driving licence</h2>
            <Field {...fieldProps('licenceNumber', 'Licence number', { hint: 'The number printed on your licence card.' })} />
            <div className={`ob-field${errors.licenceCode ? ' ob-field-error' : ''}`}>
              <label htmlFor="ob-licenceCode">Licence code</label>
              <select id="ob-licenceCode" value={draft.licenceCode} aria-invalid={errors.licenceCode ? true : undefined} onChange={(event) => setText('licenceCode', event.target.value)}>
                <option value="">Choose a code</option>
                {LICENCE_CODES.map((code) => (
                  <option key={code} value={code}>Code {code}</option>
                ))}
              </select>
              {errors.licenceCode ? <p className="ob-error" role="alert">{errors.licenceCode}</p> : null}
            </div>
            <Field {...fieldProps('licenceIssue', 'Issue date', { type: 'date' })} />
            <Field {...fieldProps('licenceExpiry', 'Expiry date', { type: 'date' })} />
          </>
        ) : null}

        {stepKey === 'vehicle' ? (
          <>
            <h2>Vehicle information</h2>
            <Field {...fieldProps('vehicleReg', 'Registration number', { hint: 'For example CA 123-456.' })} />
            <Field {...fieldProps('make', 'Make', { hint: 'For example Toyota.' })} />
            <Field {...fieldProps('model', 'Model', { hint: 'For example Corolla.' })} />
            <Field {...fieldProps('year', 'Year of manufacture', { inputMode: 'numeric', maxLength: 4 })} />
            <Field {...fieldProps('vin', 'VIN (chassis number)', { maxLength: 20, hint: '17 characters, on your registration certificate.' })} />
            <Field {...fieldProps('engineNumber', 'Engine number')} />
            <div className={`ob-field${errors.usage ? ' ob-field-error' : ''}`}>
              <label htmlFor="ob-usage">How is the vehicle used?</label>
              <select id="ob-usage" value={draft.usage} aria-invalid={errors.usage ? true : undefined} onChange={(event) => setText('usage', event.target.value)}>
                <option value="">Choose one</option>
                {USAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              {errors.usage ? <p className="ob-error" role="alert">{errors.usage}</p> : null}
            </div>
          </>
        ) : null}

        {stepKey === 'cover' ? (
          <>
            <h2>Choose your cover</h2>
            <p className="ob-intro">This is the cover you are asking for. The insurer confirms what they can offer and the final price.</p>
            <fieldset className={`ob-covers${errors.cover ? ' ob-field-error' : ''}`}>
              <legend className="ob-sr">Cover type</legend>
              {COVER_OPTIONS.map((option) => (
                <label key={option.value} className={`ob-cover${draft.cover === option.value ? ' ob-cover-on' : ''}`}>
                  <input type="radio" name="cover" checked={draft.cover === option.value} onChange={() => setText('cover', option.value)} />
                  <span className="ob-cover-title">{option.label}</span>
                  <span className="ob-cover-text">{option.covers}</span>
                </label>
              ))}
              {errors.cover ? <p className="ob-error" role="alert">{errors.cover}</p> : null}
            </fieldset>
          </>
        ) : null}

        {stepKey === 'documents' ? (
          <>
            <h2>Upload your documents</h2>
            <p className="ob-callout">
              While SafeTrip is in its demo stage, please upload <strong>sample or blurred documents</strong>, not your real ID. Files are kept in a private folder that only you can open, up to 5 MB each (JPEG, PNG or PDF).
            </p>
            {DOC_KINDS.map((kind) => {
              const doc = docs.find((item) => item.kind === kind.kind)
              const error = errors[`doc-${kind.kind}`]
              return (
                <div key={kind.kind} className={`ob-doc${error ? ' ob-field-error' : ''}`}>
                  <p className="ob-doc-title">{kind.label}</p>
                  <p className="ob-hint">{kind.hint}</p>
                  {doc ? (
                    <p className="ob-doc-done">
                      ✓ Uploaded ({Math.max(1, Math.round(doc.size_bytes / 1024))} KB){' '}
                      <button type="button" className="ob-link" onClick={() => void handleView(doc)}>View</button>{' '}
                      <button type="button" className="ob-link" onClick={() => void handleRemove(doc)}>Remove</button>
                    </p>
                  ) : null}
                  <label className="ob-upload">
                    {uploading === kind.kind ? 'Uploading…' : doc ? 'Replace file' : 'Choose file'}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,application/pdf"
                      disabled={uploading !== ''}
                      onChange={(event) => void handleUpload(kind.kind, event)}
                    />
                  </label>
                  {error ? <p className="ob-error" role="alert">{error}</p> : null}
                </div>
              )
            })}
          </>
        ) : null}

        {stepKey === 'consent' ? (
          <>
            <h2>Declarations and consent</h2>
            <YesNoField id="licenceSuspended" legend="Has your driving licence ever been suspended or cancelled?" value={draft.licenceSuspended} error={errors.licenceSuspended} onChange={setYesNo} />
            <YesNoField id="insuranceDeclined" legend="Has an insurer ever declined, cancelled or refused to renew your cover?" value={draft.insuranceDeclined} error={errors.insuranceDeclined} onChange={setYesNo} />
            <div className={`ob-field${errors.claims ? ' ob-field-error' : ''}`}>
              <label htmlFor="ob-claims">How many claims have you made in the last 3 years?</label>
              <select id="ob-claims" value={draft.claims} aria-invalid={errors.claims ? true : undefined} onChange={(event) => setText('claims', event.target.value)}>
                <option value="">Choose a number</option>
                <option value="0">None</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3+">3 or more</option>
              </select>
              {errors.claims ? <p className="ob-error" role="alert">{errors.claims}</p> : null}
            </div>
            <Check checked={draft.consentTerms} error={errors.consentTerms} onChange={(value) => setFlag('consentTerms', value)}>
              I have read and accept the SafeTrip terms of use and understand that SafeTrip rewards are discounts only.
            </Check>
            <Check checked={draft.consentProcessing} error={errors.consentProcessing} onChange={(value) => setFlag('consentProcessing', value)}>
              I allow SafeTrip to collect and process my personal information, including my ID number and documents, to handle this application.
            </Check>
            <Check checked={draft.consentVerification} error={errors.consentVerification} onChange={(value) => setFlag('consentVerification', value)}>
              I allow the insurer to verify my details, including my licence, vehicle and claims history.
            </Check>
            <Check checked={draft.declarationTrue} error={errors.declarationTrue} onChange={(value) => setFlag('declarationTrue', value)}>
              I declare that everything I have told you is true and complete. I understand that false information can lead to my application being declined or a claim being refused.
            </Check>
          </>
        ) : null}

        {stepKey === 'review' ? (
          <>
            <h2>Review and submit</h2>
            <p className="ob-intro">Check everything below. You can open any step to change it.</p>
            <Summary draft={draft} docs={docs} onEdit={goTo} />
            <p className="ob-callout">
              Submitting sends your application to the insurer. They verify your details and decide. Your cover does not start until they confirm it.
            </p>
          </>
        ) : null}

        {problem ? <p className="ob-error ob-problem" role="alert">{problem}</p> : null}
        {notice ? <p className="ob-ok" role="status">{notice}</p> : null}

        <div className="ob-actions">
          {step > 0 ? (
            <button type="button" className="ob-secondary" disabled={busy} onClick={handleBack}>Back</button>
          ) : null}
          <button type="button" className="ob-secondary" disabled={busy} onClick={() => void handleSaveLater()}>
            Save and finish later
          </button>
          {stepKey === 'review' ? (
            <button type="button" className="ob-primary" disabled={busy} onClick={() => void handleSubmit()}>
              {busy ? 'Submitting…' : 'Submit application'}
            </button>
          ) : (
            <button type="button" className="ob-primary" disabled={busy} onClick={() => void handleNext()}>
              {busy ? 'Saving…' : 'Next'}
            </button>
          )}
        </div>
      </form>
    </section>
  )
}

function Summary({ draft, docs, onEdit }: { draft: OnboardingDraft; docs: DocumentRow[]; onEdit: ((index: number) => void) | null }) {
  const cover = COVER_OPTIONS.find((option) => option.value === draft.cover)?.label ?? '—'
  const usage = USAGE_OPTIONS.find((option) => option.value === draft.usage)?.label ?? '—'
  const kinds = new Set(docs.map((doc) => doc.kind))
  const sections: { index: number; title: string; lines: [string, string][] }[] = [
    {
      index: 0,
      title: 'About you',
      lines: [
        ['Name', draft.fullName || '—'],
        ['ID number', maskId(draft.idNumber) || '—'],
        ['Date of birth', dateText(draft.dateOfBirth)],
        ['Cellphone', draft.phone || '—'],
        ['Email', draft.email || '—'],
        ['Address', [draft.addressLine, draft.suburb, draft.city, draft.postalCode].filter(Boolean).join(', ') || '—'],
      ],
    },
    {
      index: 1,
      title: 'Driving licence',
      lines: [
        ['Number', draft.licenceNumber || '—'],
        ['Code', draft.licenceCode || '—'],
        ['Issued', dateText(draft.licenceIssue)],
        ['Expires', dateText(draft.licenceExpiry)],
      ],
    },
    {
      index: 2,
      title: 'Vehicle',
      lines: [
        ['Registration', draft.vehicleReg || '—'],
        ['Vehicle', [draft.year, draft.make, draft.model].filter(Boolean).join(' ') || '—'],
        ['VIN', draft.vin || '—'],
        ['Engine number', draft.engineNumber || '—'],
        ['Use', usage],
      ],
    },
    { index: 3, title: 'Cover requested', lines: [['Cover', cover]] },
    {
      index: 4,
      title: 'Documents',
      lines: DOC_KINDS.map((kind): [string, string] => [kind.label, kinds.has(kind.kind) ? 'Uploaded' : 'Missing']),
    },
  ]
  return (
    <div className="ob-summary">
      {sections.map((section) => (
        <section key={section.title} className="ob-summary-card">
          <header>
            <h3>{section.title}</h3>
            {onEdit ? <button type="button" className="ob-link" onClick={() => onEdit(section.index)}>Change</button> : null}
          </header>
          <dl>
            {section.lines.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  )
}
