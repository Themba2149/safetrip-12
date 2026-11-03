import { useState } from 'react'
import type { ChangeEvent, FormEvent, MouseEvent } from 'react'
import AuthLayout from '../components/AuthLayout'
import { NOT_CONFIGURED_MESSAGE, emailRedirectTo, friendlyAuthError, supabase } from '../lib/supabase'
import { validateLogin } from '../validation'

type Field = 'email' | 'password'
type SocialProvider = 'google' | 'facebook' | 'apple'

// The insurer sign-in now lives in the separate business portal. This page is for drivers only.
// Delete any provider you have NOT switched on in Supabase (Authentication > Sign In / Providers).
const SOCIAL_PROVIDERS: { id: SocialProvider; label: string }[] = [
  { id: 'google', label: 'Google' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'apple', label: 'Apple' },
]

type Props = {
  onCreateAccount: () => void
  onForgotPassword: () => void
  onBack: () => void
}

// "Remember me" keeps the EMAIL ONLY in this browser. The password is never stored.
const REMEMBER_KEY = 'safetrip.rememberedEmail'

function readRememberedEmail(): string {
  try {
    return window.localStorage.getItem(REMEMBER_KEY) || ''
  } catch {
    return ''
  }
}

function writeRememberedEmail(email: string): void {
  try {
    if (email) window.localStorage.setItem(REMEMBER_KEY, email)
    else window.localStorage.removeItem(REMEMBER_KEY)
  } catch {
    // Storage can be blocked (private windows). Sign-in still works without it.
  }
}

export default function LoginPage({
  onCreateAccount,
  onForgotPassword,
  onBack,
}: Props) {
  const [email, setEmail] = useState<string>(() => readRememberedEmail())
  const [password, setPassword] = useState<string>('')
  const [showPassword, setShowPassword] = useState<boolean>(false)
  const [remember, setRemember] = useState<boolean>(() => readRememberedEmail() !== '')
  const [touched, setTouched] = useState<Record<Field, boolean>>({ email: false, password: false })
  const [submitted, setSubmitted] = useState<boolean>(false)
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [socialBusy, setSocialBusy] = useState<SocialProvider | null>(null)
  const [error, setError] = useState<string>('')
  const [unverified, setUnverified] = useState<boolean>(false)
  const [resendMessage, setResendMessage] = useState<string>('')

  const errors = validateLogin({ email, password })
  const visibleError = (field: Field): string => (touched[field] || submitted ? errors[field] : '')
  const emailError = visibleError('email')
  const passwordError = visibleError('password')

  function touch(field: Field) {
    setTouched((current) => ({ ...current, [field]: true }))
  }

  async function handleSocial(provider: SocialProvider, label: string) {
    setError('')
    if (!supabase) {
      setError(NOT_CONFIGURED_MESSAGE)
      return
    }
    setSocialBusy(provider)
    try {
      // On success the browser leaves for the provider, then returns here signed in.
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: window.location.origin },
      })
      if (oauthError) {
        setSocialBusy(null)
        setError(`Sign-in with ${label} is not available yet. Please use your email and password.`)
      }
    } catch {
      setSocialBusy(null)
      setError('Could not reach the server. Check your internet connection and try again.')
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitted(true)
    setError('')
    setUnverified(false)
    setResendMessage('')

    if (errors.email || errors.password) {
      const firstBad: Field = errors.email ? 'email' : 'password'
      document.getElementById(firstBad)?.focus()
      return
    }
    if (!supabase) {
      setError(NOT_CONFIGURED_MESSAGE)
      return
    }

    setSubmitting(true)
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (signInError) {
        if (signInError.code === 'email_not_confirmed') {
          setUnverified(true)
        } else if (signInError.code === 'invalid_credentials') {
          // Same message for "no such account" and "wrong password", so nobody can probe which emails exist.
          setError('Incorrect email or password.')
        } else {
          setError(friendlyAuthError(signInError))
        }
        return
      }

      writeRememberedEmail(remember ? email.trim() : '')

      // App.tsx hears about the new session and shows the dashboard.
    } catch {
      setError('Could not reach the server. Check your internet connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResend() {
    if (!supabase) return
    setResendMessage('')
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
        options: { emailRedirectTo },
      })
      setResendMessage(
        resendError ? friendlyAuthError(resendError) : 'We sent a new verification email. Check your inbox.',
      )
    } catch {
      setResendMessage('Could not reach the server. Try again.')
    }
  }

  return (
    <AuthLayout footnote="Your password is handled by Supabase Authentication. SafeTrip never stores it.">
      <form className="card" noValidate onSubmit={handleSubmit}>
        <div className="heading">
          <h1>Welcome back</h1>
          <p>Sign in to your SafeTrip Rewards driver account.</p>
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
            aria-invalid={emailError ? 'true' : 'false'}
            aria-describedby={emailError ? 'email-error' : undefined}
          />
          {emailError && (
            <p id="email-error" className="error">
              {emailError}
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
              autoComplete="current-password"
              placeholder="Your password"
              value={password}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setPassword(event.target.value)}
              onBlur={() => touch('password')}
              aria-invalid={passwordError ? 'true' : 'false'}
              aria-describedby={passwordError ? 'password-error' : undefined}
            />
            <button
              type="button"
              className="toggle"
              aria-pressed={showPassword ? 'true' : 'false'}
              aria-controls="password"
              onClick={() => setShowPassword((current) => !current)}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          {passwordError && (
            <p id="password-error" className="error">
              {passwordError}
            </p>
          )}
        </div>

        <div className="options">
          <label className="remember" htmlFor="remember">
            <input
              id="remember"
              name="remember"
              type="checkbox"
              checked={remember}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setRemember(event.target.checked)}
            />
            <span>Remember me</span>
          </label>
          <a
            className="link"
            href="#forgot"
            onClick={(event: MouseEvent<HTMLAnchorElement>) => {
              event.preventDefault()
              onForgotPassword()
            }}
          >
            Forgot password?
          </a>
        </div>

        <p className="error-box" role="alert" hidden={!error}>
          {error}
        </p>

        {unverified && (
          <div className="error-box" role="alert">
            <p>Your email address is not verified yet. Open the link we emailed you, then sign in.</p>
            <button type="button" className="link-button" onClick={handleResend}>
              Send the verification email again
            </button>
            {resendMessage && <p className="note">{resendMessage}</p>}
          </div>
        )}

        <button type="submit" className="primary" disabled={submitting || socialBusy !== null}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>

        {SOCIAL_PROVIDERS.length > 0 && (
          <>
            <div className="or-divider" aria-hidden="true">
              <span>Or</span>
            </div>
            <div className="social-buttons">
              {SOCIAL_PROVIDERS.map((provider) => (
                <button
                  key={provider.id}
                  type="button"
                  className="social"
                  disabled={submitting || socialBusy !== null}
                  onClick={() => void handleSocial(provider.id, provider.label)}
                >
                  {socialBusy === provider.id ? 'Opening…' : `Continue with ${provider.label}`}
                </button>
              ))}
            </div>
          </>
        )}

        <p className="alt">
          New driver?{' '}
          <a
            className="link"
            href="#create"
            onClick={(event: MouseEvent<HTMLAnchorElement>) => {
              event.preventDefault()
              onCreateAccount()
            }}
          >
            Create account
          </a>
        </p>

        <p className="alt">
          <button type="button" className="link-button" onClick={onBack}>
            ← Back to home
          </button>
        </p>
      </form>
    </AuthLayout>
  )
}