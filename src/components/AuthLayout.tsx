import type { ReactNode } from 'react'

type Props = {
  children: ReactNode
  footnote: string
}

// The shared frame for every sign-in page: brand panel on the left, the page's card on the right.
export default function AuthLayout({ children, footnote }: Props) {
  return (
    <main className="login">
      <section className="brand" aria-label="About SafeTrip Rewards">
        <div className="lockup">
          <img className="lockup-logo" src="/safetrip-logo.svg" alt="" width="48" height="48" />
          <span className="lockup-name">SafeTrip Rewards</span>
        </div>
        <p className="tagline">Warn first. Reward the safer choice.</p>
        <ul className="points">
          <li>Advice before every trip</li>
          <li>Points for safer choices</li>
          <li>Your premium can only go down</li>
        </ul>
      </section>

      <section className="panel">
        {children}
        <p className="phase-note">{footnote}</p>
      </section>
    </main>
  )
}