import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { isInsurer } from './lib/roles'
import { loadMyProfile } from './lib/profileApi'
import { loadRewardEvents } from './lib/rewardsApi'
import { fromRow } from './data/profile'
import type { Profile } from './data/profile'
import { balanceOf, entryFromRow } from './data/wallet'
import type { LedgerEntry } from './data/wallet'
import type { Page } from './components/DashboardLayout'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import CheckEmailPage from './pages/CheckEmailPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import DashboardPage from './pages/DashboardPage'
import TripAdvisorPage from './pages/TripAdvisorPage'
import RewardsPage from './pages/RewardsPage'
import ProfilePage from './pages/ProfilePage'
import OnboardingPage from './pages/OnboardingPage'
import './App.css'

type View = 'home' | 'login' | 'register' | 'check-email' | 'forgot'
type ProfileStatus = 'loading' | 'ready' | 'error'

// Real accounts start with no points. Every point comes from a saved reward.
const OPENING_BALANCE = 0

function cameFromVerificationEmail(): boolean {
  return new URLSearchParams(window.location.search).get('verified') === '1'
}

// Simple screen switching for now. A proper router can come later.
export default function App() {
  // Visitors start on the home page. The verification email link goes straight to sign-in.
  const [view, setView] = useState<View>(() => (cameFromVerificationEmail() ? 'login' : 'home'))
  const [page, setPage] = useState<Page>('overview')
  const [pendingEmail, setPendingEmail] = useState<string>('')
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState<boolean>(supabase !== null)
  const [recovering, setRecovering] = useState<boolean>(false)

  // The driver's real profile and points history, stored in the database.
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileStatus, setProfileStatus] = useState<ProfileStatus>('loading')
  const [ledger, setLedger] = useState<LedgerEntry[]>([])
  const [rewardsError, setRewardsError] = useState<string>('')
  const points = balanceOf(OPENING_BALANCE, ledger)

  // The link in the verification email returns here as /?verified=1
  const [justVerified] = useState<boolean>(cameFromVerificationEmail)

  const userId = session?.user.id ?? null
  const fallbackName = (session?.user.user_metadata as { full_name?: string } | undefined)?.full_name ?? ''
  // Insurer accounts belong to the separate business portal. This portal is for drivers only.
  const insurerUser = isInsurer(session?.user.app_metadata)

  useEffect(() => {
    if (!supabase) return

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession)
      if (event === 'PASSWORD_RECOVERY') setRecovering(true)
      if (event === 'SIGNED_OUT') {
        setRecovering(false)
        setView('home')
        setPage('overview')
      }
    })

    return () => data.subscription.unsubscribe()
  }, [])

  // Load the profile once per signed-in driver (insurers have no driver profile).
  useEffect(() => {
    if (!userId || insurerUser) {
      setProfile(null)
      setProfileStatus('loading')
      return
    }
    let cancelled = false
    loadMyProfile(userId).then(({ row, error }) => {
      if (cancelled) return
      if (error) {
        setProfileStatus('error')
        return
      }
      setProfile(fromRow(row, fallbackName))
      setProfileStatus('ready')
    })
    return () => {
      cancelled = true
    }
  }, [userId, fallbackName, insurerUser])

  // Load the points history once per signed-in driver.
  useEffect(() => {
    if (!userId || insurerUser) {
      setLedger([])
      setRewardsError('')
      return
    }
    let cancelled = false
    loadRewardEvents().then(({ rows, error }) => {
      if (cancelled) return
      if (error) {
        setRewardsError(error)
        return
      }
      setRewardsError('')
      setLedger(rows.map((row) => entryFromRow(row)))
    })
    return () => {
      cancelled = true
    }
  }, [userId, insurerUser])

  function openSignIn() {
    setView('login')
  }

  if (loading) {
    return (
      <main className="loading" aria-busy="true">
        <p>Loading…</p>
      </main>
    )
  }

  if (session && recovering) {
    return <ResetPasswordPage onDone={() => setRecovering(false)} />
  }

  if (session && insurerUser) {
    return (
      <main className="loading">
        <div>
          <p>This portal is for drivers. Insurer accounts use the SafeTrip business portal.</p>
          <p>
            <button type="button" className="secondary" onClick={() => void supabase?.auth.signOut()}>
              Sign out
            </button>
          </p>
        </div>
      </main>
    )
  }

  if (session) {
    const activePage: Page = page
    let content: ReactNode

    if (activePage === 'profile') {
      content = (
        <ProfilePage
          user={session.user}
          status={profileStatus}
          profile={profile}
          onSaved={setProfile}
          onNavigate={setPage}
        />
      )
    } else if (activePage === 'advisor') {
      content = (
        <TripAdvisorPage
          user={session.user}
          points={points}
          onEarned={(entry) => setLedger((current) => [entry, ...current])}
          onNavigate={setPage}
        />
      )
    } else if (activePage === 'rewards') {
      content = (
        <RewardsPage
          user={session.user}
          points={points}
          ledger={ledger}
          opening={OPENING_BALANCE}
          loadError={rewardsError}
          onNavigate={setPage}
        />
      )
    } else if (activePage === 'onboarding') {
      content = <OnboardingPage user={session.user} onNavigate={setPage} />
    } else {
      content = (
        <DashboardPage
          user={session.user}
          justVerified={justVerified}
          profile={profile}
          profileStatus={profileStatus}
          points={points}
          onNavigate={setPage}
        />
      )
    }

    return content
  }

  if (view === 'home') {
    return <HomePage onSignIn={openSignIn} onGetStarted={() => setView('register')} />
  }

  if (view === 'register') {
    return (
      <RegisterPage
        onBackToLogin={() => setView('login')}
        onRegistered={(email) => {
          setPendingEmail(email)
          setView('check-email')
        }}
      />
    )
  }

  if (view === 'check-email') {
    return (
      <CheckEmailPage
        email={pendingEmail}
        onUseDifferentEmail={() => setView('register')}
        onBackToLogin={() => setView('login')}
      />
    )
  }

  if (view === 'forgot') {
    return <ForgotPasswordPage onBackToLogin={() => setView('login')} />
  }

  return (
    <LoginPage
      onCreateAccount={() => setView('register')}
      onForgotPassword={() => setView('forgot')}
      onBack={() => setView('home')}
    />
  )
}
