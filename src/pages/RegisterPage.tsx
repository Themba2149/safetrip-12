import { useState } from 'react'
import type { ChangeEvent, FormEvent, MouseEvent } from 'react'
import AuthLayout from '../components/AuthLayout'
import { NOT_CONFIGURED_MESSAGE, emailRedirectTo, friendlyAuthError, supabase } from '../lib/supabase'
import { passwordRules, validateRegistration } from '../validation'
import type { RegistrationField } from '../validation'

type Props = {
  onBackToLogin: () => void
  onRegistered: (email: string) => void
}

const FIELD_ORDER: RegistrationField[] = ['fullName', 'email', 'password', 'confirm', 'agree']

export default function RegisterPage({ onBackToLogin, onRegistered }: Props) {
  const [fullName, setFullName] = useState<string>('')
  const [email, setEmail] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [confirm, setConfirm] = useState<string>('')
  const [showPassword, setShowPassword] = useState<boolean>(false)
  const [agreed, setAgreed] = useState<boolean>(false)
  const [touched, setTouched] = useState<Record<RegistrationField, boolean>>({
    fullName: false,
    email: false,
    password: false,
    confirm: false,
    agree: false,
  })
  const [submitted, setSubmitted] = useState<boolean>(false)
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [serverError, setServerError] = useState<string>('')

  const errors = validateRegistration({ fullName, email, password, confirm, agreed })
  const shown = (field: RegistrationField): string => (touched[field] || submitted ? errors[field] : '')
  const rules = passwordRules(password)

  function touch(field: RegistrationField) {
    setTouched((current) => ({ ...current, [field]: true }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitted(true)
    setServerError('')

    const firstBad = FIELD_ORDER.find((field) => errors[field] !== '')
    if (firstBad) {
      document.getElementById(firstBad)?.focus()
      return
    }
    if (!supabase) {
      setServerError(NOT_CONFIGURED_MESSAGE)
      return
    }

    setSubmitting(true)
    try {
      // Supabase stores the account and sends the verification email. We never see or store the password.
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo,
          data: { full_name: fullName.trim(), terms_accepted_at: new Date().toISOString() },
        },
      })
      if (error) {
        setServerError(friendlyAuthError(error))
        return
      }
      onRegistered(email.trim())
    } catch {
      setServerError('Could not reach the server. Check your internet connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout footnote="Your account is created in Supabase and a verification email is sent.">
      <form className="card" noValidate onSubmit={handleSubmit}>
        <div className="heading">
          <h1>Create your account</h1>
          <p>
            Create your SafeTrip driver account to use Trip Advisor, earn rewards, and apply for cover after signing in.
          </p>
        </div>

        <div className="field">
          <label htmlFor="fullName">Full name</label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            autoComplete="name"
            placeholder="Thandi Mokoena"
            value={fullName}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setFullName(event.target.value)}
            onBlur={() => touch('fullName')}
            aria-invalid={shown('fullName') ? 'true' : 'false'}
            aria-describedby={shown('fullName') ? 'fullName-error' : undefined}
          />
          {shown('fullName') && (
            <p id="fullName-error" className="error">
              {shown('fullName')}
            </p>
          )}
        </div>

        <div className="field">
          <label htmlFor="email">Email address</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setEmail(event.target.value)}
            onBlur={() => touch('email')}
            aria-invalid={shown('email') ? 'true' : 'false'}
            aria-describedby={shown('email') ? 'email-error' : undefined}
          />
          {shown('email') && (
            <p id="email-error" className="error">
              {shown('email')}
            </p>
          )}
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <div className="input-row">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Create a password"
              value={password}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setPassword(event.target.value)}
              onBlur={() => touch('password')}
              aria-invalid={shown('password') ? 'true' : 'false'}
              aria-describedby="password-rules"
            />
            <button
              type="button"
              className="toggle"
              aria-pressed={showPassword ? 'true' : 'false'}
              aria-controls="password confirm"
              onClick={() => setShowPassword((current) => !current)}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          <ul id="password-rules" className="rules">
            {rules.map((rule) => (
              <li key={rule.label} className={rule.met ? 'met' : ''}>
                {rule.label}
                <span className="sr">{rule.met ? ' (done)' : ' (not yet)'}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="field">
          <label htmlFor="confirm">Confirm password</label>
          <input
            id="confirm"
            name="confirm"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="Re-enter your password"
            value={confirm}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setConfirm(event.target.value)}
            onBlur={() => touch('confirm')}
            aria-invalid={shown('confirm') ? 'true' : 'false'}
            aria-describedby={shown('confirm') ? 'confirm-error' : undefined}
          />
          {shown('confirm') && (
            <p id="confirm-error" className="error">
              {shown('confirm')}
            </p>
          )}
        </div>

        <div className="field">
          <label className="consent" htmlFor="agree">
            <input
              id="agree"
              name="agree"
              type="checkbox"
              checked={agreed}
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                setAgreed(event.target.checked)
                touch('agree')
              }}
              aria-invalid={shown('agree') ? 'true' : 'false'}
              aria-describedby={shown('agree') ? 'agree-error' : undefined}
            />
            <span>
              I agree to the SafeTrip Rewards terms and privacy notice, and I consent to SafeTrip using my trip
              information to give me advice and rewards.
            </span>
          </label>
          {shown('agree') && (
            <p id="agree-error" className="error">
              {shown('agree')}
            </p>
          )}
        </div>

        <p className="error-box" role="alert" hidden={!serverError}>
          {serverError}
        </p>

        <button type="submit" className="primary" disabled={submitting}>
          {submitting ? 'Creating your account…' : 'Create account'}
        </button>

        <p className="alt">
          Already have an account?{' '}
          <a
            className="link"
            href="#signin"
            onClick={(event: MouseEvent<HTMLAnchorElement>) => {
              event.preventDefault()
              onBackToLogin()
            }}
          >
            Sign in
          </a>
        </p>
      </form>
    </AuthLayout>
  )
}