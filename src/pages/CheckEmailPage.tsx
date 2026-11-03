import { useState } from 'react'
import type { MouseEvent } from 'react'
import AuthLayout from '../components/AuthLayout'
import { NOT_CONFIGURED_MESSAGE, emailRedirectTo, friendlyAuthError, supabase } from '../lib/supabase'

type Props = {
  email: string
  onUseDifferentEmail: () => void
  onBackToLogin: () => void
}

type ResendState = { kind: 'idle' | 'sent' | 'error'; message: string }

const RESEND_WAIT_MS = 30_000

export default function CheckEmailPage({ email, onUseDifferentEmail, onBackToLogin }: Props) {
  const [resend, setResend] = useState<ResendState>({ kind: 'idle', message: '' })
  const [waiting, setWaiting] = useState<boolean>(false)

  async function handleResend() {
    if (!supabase) {
      setResend({ kind: 'error', message: NOT_CONFIGURED_MESSAGE })
      return
    }
    setWaiting(true)
    // Let the driver ask again after 30 seconds, so the button cannot be hammered.
    setTimeout(() => setWaiting(false), RESEND_WAIT_MS)
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo } })
      if (error) setResend({ kind: 'error', message: friendlyAuthError(error) })
      else setResend({ kind: 'sent', message: 'We sent the email again. It can take a minute to arrive.' })
    } catch {
      setResend({ kind: 'error', message: 'Could not reach the server. Check your internet connection and try again.' })
    }
  }

  return (
    <AuthLayout footnote="The link in the email brings you back here once your address is confirmed.">
      <div className="card">
        <img className="mail-icon" src="/mail-sent.svg" alt="" width="64" height="64" />
        <div className="heading">
          <h1>Check your email</h1>
          <p>
            We sent a verification link to <strong className="address">{email}</strong>.
          </p>
        </div>

        <ol className="steps">
          <li>Open the email from SafeTrip Rewards.</li>
          <li>Tap the Confirm button inside it.</li>
          <li>You come back here, verified and signed in.</li>
        </ol>

        <p className="note">Nothing in your inbox? Look in your spam or junk folder first.</p>

        <p
          className={resend.kind === 'error' ? 'error-box' : 'notice'}
          role={resend.kind === 'error' ? 'alert' : 'status'}
          hidden={resend.kind === 'idle'}
        >
          {resend.message}
        </p>

        <button type="button" className="secondary" disabled={waiting} onClick={handleResend}>
          {waiting ? 'Email sent. You can resend in 30 seconds' : 'Resend the email'}
        </button>

        <p className="alt">
          Wrong address?{' '}
          <a
            className="link"
            href="#register"
            onClick={(event: MouseEvent<HTMLAnchorElement>) => {
              event.preventDefault()
              onUseDifferentEmail()
            }}
          >
            Use a different email
          </a>
          {' · '}
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
      </div>
    </AuthLayout>
  )
}