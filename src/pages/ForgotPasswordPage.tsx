import { useState } from 'react'
import type { ChangeEvent, FormEvent, MouseEvent } from 'react'
import AuthLayout from '../components/AuthLayout'
import { NOT_CONFIGURED_MESSAGE, friendlyAuthError, supabase } from '../lib/supabase'
import { validateEmail } from '../validation'

type Props = { onBackToLogin: () => void }

export default function ForgotPasswordPage({ onBackToLogin }: Props) {
  const [email, setEmail] = useState<string>('')
  const [touched, setTouched] = useState<boolean>(false)
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [error, setError] = useState<string>('')
  const [sent, setSent] = useState<boolean>(false)

  const emailError = touched ? validateEmail(email) : ''

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setTouched(true)
    setError('')
    if (validateEmail(email)) {
      document.getElementById('email')?.focus()
      return
    }
    if (!supabase) {
      setError(NOT_CONFIGURED_MESSAGE)
      return
    }
    setSubmitting(true)
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin,
      })
      if (resetError) {
        setError(friendlyAuthError(resetError))
        return
      }
      // Same message whether or not the account exists, so nobody can probe which emails are registered.
      setSent(true)
    } catch {
      setError('Could not reach the server. Check your internet connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout footnote="The reset link opens this site so you can choose a new password.">
      <form className="card" noValidate onSubmit={handleSubmit}>
        <div className="heading">
          <h1>Reset your password</h1>
          <p>Enter your email and we will send you a link to choose a new password.</p>
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
            onBlur={() => setTouched(true)}
            aria-invalid={emailError ? 'true' : 'false'}
            aria-describedby={emailError ? 'email-error' : undefined}
          />
          {emailError && (
            <p id="email-error" className="error">
              {emailError}
            </p>
          )}
        </div>

        <p className="error-box" role="alert" hidden={!error}>
          {error}
        </p>
        <p className="notice" role="status" hidden={!sent}>
          If an account exists for that address, a reset link is on its way. Check your inbox and spam folder.
        </p>

        <button type="submit" className="primary" disabled={submitting}>
          {submitting ? 'Sending…' : 'Send reset link'}
        </button>

        <p className="alt">
          <a
            className="link"
            href="#signin"
            onClick={(event: MouseEvent<HTMLAnchorElement>) => {
              event.preventDefault()
              onBackToLogin()
            }}
          >
            Back to sign in
          </a>
        </p>
      </form>
    </AuthLayout>
  )
}
