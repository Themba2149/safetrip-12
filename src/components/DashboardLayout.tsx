import { useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../lib/supabase'

export type Page = 'overview' | 'advisor' | 'rewards' | 'onboarding' | 'profile'

type Props = {
  name: string
  current: Page
  onNavigate: (page: Page) => void
  children: ReactNode
}

// Only pages available in the driver portal are shown.
const DRIVER_TABS: { page: Page; label: string }[] = [
  { page: 'overview', label: 'Overview' },
  { page: 'onboarding', label: 'Apply for cover' },
  { page: 'advisor', label: 'Trip Advisor' },
  { page: 'rewards', label: 'Rewards' },
  { page: 'profile', label: 'Profile' },
]

// Phones: three main tabs on the bottom bar, the rest under "More".
const BAR_TABS: { page: Page; label: string }[] = [
  { page: 'overview', label: 'Home' },
  { page: 'advisor', label: 'Trip' },
  { page: 'rewards', label: 'Rewards' },
]

const MORE_TABS: { page: Page; label: string }[] = [
  { page: 'onboarding', label: 'Apply for cover' },
  { page: 'profile', label: 'Profile' },
]

export default function DashboardLayout({ name, current, onNavigate, children }: Props) {
  const [signingOut, setSigningOut] = useState<boolean>(false)
  const [moreOpen, setMoreOpen] = useState<boolean>(false)

  async function handleSignOut() {
    if (!supabase) return
    setSigningOut(true)
    await supabase.auth.signOut()
    // App.tsx hears the SIGNED_OUT event and shows the sign-in page again.
    setSigningOut(false)
  }

  function go(page: Page) {
    setMoreOpen(false)
    onNavigate(page)
  }

  const moreIsCurrent = MORE_TABS.some((tab) => tab.page === current)

  return (
    <div className="dash">
      <header className="dash-header">
        <div className="dash-brand">
          <img src="/safetrip-logo.svg" alt="" width="36" height="36" />
          <span>SafeTrip Driver Portal</span>
        </div>

        <nav className="dash-nav" aria-label="Main">
          {DRIVER_TABS.map((tab) => (
            <button
              key={tab.page}
              type="button"
              className={current === tab.page ? 'dash-tab current' : 'dash-tab'}
              aria-current={current === tab.page ? 'page' : undefined}
              onClick={() => go(tab.page)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="dash-user">
          <span className="dash-name">{name}</span>
          <button type="button" className="secondary small" disabled={signingOut} onClick={handleSignOut}>
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </header>

      <main className="dash-main">{children}</main>

      <>
          {moreOpen && (
            <div
              id="more-panel"
              className="more-panel"
              role="menu"
              aria-label="More"
              onKeyDown={(event) => {
                if (event.key === 'Escape') setMoreOpen(false)
              }}
            >
              {MORE_TABS.map((tab) => (
                <button
                  key={tab.page}
                  type="button"
                  role="menuitem"
                  className={current === tab.page ? 'more-item current' : 'more-item'}
                  onClick={() => go(tab.page)}
                >
                  {tab.label}
                </button>
              ))}
              <button type="button" role="menuitem" className="more-item" disabled={signingOut} onClick={handleSignOut}>
                {signingOut ? 'Signing out…' : 'Sign out'}
              </button>
            </div>
          )}

          <nav className="tabbar" aria-label="Quick menu">
            {BAR_TABS.map((tab) => (
              <button
                key={tab.page}
                type="button"
                className={current === tab.page ? 'tabbar-item current' : 'tabbar-item'}
                aria-current={current === tab.page ? 'page' : undefined}
                onClick={() => go(tab.page)}
              >
                <span className="tabbar-label">{tab.label}</span>
              </button>
            ))}
            <button
              type="button"
              className={moreIsCurrent || moreOpen ? 'tabbar-item current' : 'tabbar-item'}
              aria-expanded={moreOpen ? 'true' : 'false'}
              aria-controls="more-panel"
              onClick={() => setMoreOpen((open) => !open)}
            >
              <span className="tabbar-label">More</span>
            </button>
          </nav>
      </>
    </div>
  )
}
