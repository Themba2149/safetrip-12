import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import AuthLayout from '../components/AuthLayout'
import { NOT_CONFIGURED_MESSAGE, friendlyAuthError, supabase } from '../lib/supabase'
import { passwordRules, validateConfirm, validateNewPassword } from '../validation'

type Props = { onDone: () => void }

export default function ResetPasswordPage({ onDone }: Props) {
  const [password, setPassword] = useState<string>('')
  const [confirm, setConfirm] = useState<string>('')
  const [show, setShow] = useState<boolean>(false)
  const [submitted, setSubmitted] = useState<boolean>(false)
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [error, setError] = useState<string>('')

  const passwordError = submitted ? validateNewPassword(password) : ''
  const confirmError = submitted ? validateConfirm(password, confirm) : ''
  const rules = passwordRules(password)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitted(true)
    setError('')
    if (validateNewPassword(password)) {
      document.getElementById('password')?.focus()
      return
    }
    if (validateConfirm(password, confirm)) {
      document.getElementById('confirm')?.focus()
      return
    }
    if (!supabase) {
      setError(NOT_CONFIGURED_MESSAGE)
      return
    }
    setSubmitting(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) {
        setError(friendlyAuthError(updateError))
        return
      }
      onDone()
    } catch {
      setError('Could not reach the server. Check your internet connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout footnote="You opened a secure reset link, so you can set a new password now.">
      <form className="card" noValidate onSubmit={handleSubmit}>
        <div className="heading">
          <h1>Choose a new password</h1>
          <p>Pick something you do not use anywhere else.</p>
        </div>

        <div className="field">
          <label htmlFor="password">New password</label>
          <div className="input-row">
            <input
              id="password"
              name="password"
              type={show ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setPassword(event.target.value)}
              aria-invalid={passwordError ? 'true' : 'false'}
              aria-describedby="password-rules"
            />
            <button
              type="button"
              className="toggle"
              aria-pressed={show ? 'true' : 'false'}
              aria-controls="password confirm"
              onClick={() => setShow((current) => !current)}
            >
              {show ? 'Hide' : 'Show'}
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
          {passwordError && <p className="error">{passwordError}</p>}
        </div>

        <div className="field">
          <label htmlFor="confirm">Confirm new password</label>
          <input
            id="confirm"
            name="confirm"
            type={show ? 'text' : 'password'}
            autoComplete="new-password"
            value={confirm}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setConfirm(event.target.value)}
            aria-invalid={confirmError ? 'true' : 'false'}
          />
          {confirmError && <p className="error">{confirmError}</p>}
        </div>

        <p className="error-box" role="alert" hidden={!error}>
          {error}
        </p>

        <button type="submit" className="primary" disabled={submitting}>
          {submitting ? 'Saving…' : 'Save new password'}
        </button>
      </form>
    </AuthLayout>
  )
}