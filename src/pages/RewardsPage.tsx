import type { User } from '@supabase/supabase-js'
import DashboardLayout from '../components/DashboardLayout'
import type { Page } from '../components/DashboardLayout'
import {
  BASE_MONTHLY_PREMIUM,
  MAX_DISCOUNT_PERCENT,
  POINTS_PER_PERCENT,
  discountPercent,
  discountedPremium,
  pointsToNextPercent,
} from '../data/mockDriver'
import { EARN_RULES, progressToCap, progressToNext } from '../data/wallet'
import type { LedgerEntry } from '../data/wallet'

type Props = {
  user: User
  points: number
  ledger: LedgerEntry[]
  opening: number
  loadError: string
  onNavigate: (page: Page) => void
}

function rand(value: number): string {
  return `R${value.toLocaleString('en-ZA')}`
}

export default function RewardsPage({ user, points, ledger, opening, loadError, onNavigate }: Props) {
  const meta = user.user_metadata as { full_name?: string } | undefined
  const fullName = meta?.full_name || user.email || 'Driver'

  const discount = discountPercent(points)
  const premium = discountedPremium(points)
  const saving = BASE_MONTHLY_PREMIUM - premium
  const toNext = pointsToNextPercent(points)
  const nextProgress = progressToNext(points)
  const capProgress = progressToCap(points)

  return (
    <DashboardLayout name={fullName} current="rewards" onNavigate={onNavigate}>
      <div className="dash-title">
        <h1>Rewards wallet</h1>
        <p>Every safer choice earns points. Points only ever lower your premium.</p>
      </div>

      {loadError && (
        <p className="error-box" role="alert">
          We could not load your points. {loadError}
        </p>
      )}

      <section className="dash-grid" aria-label="Wallet summary">
        <article className="tile">
          <h2>Points balance</h2>
          <p className="big">{points.toLocaleString('en-ZA')}</p>
          <p className="muted">{POINTS_PER_PERCENT} points = 1% off, up to {MAX_DISCOUNT_PERCENT}%.</p>
        </article>

        <article className="tile">
          <h2>Your discount</h2>
          <p className="big">{discount}%</p>
          <p className="muted">
            {saving > 0
              ? `${rand(saving)} off each month, so you pay ${rand(premium)} instead of ${rand(BASE_MONTHLY_PREMIUM)}.`
              : `Earn ${POINTS_PER_PERCENT} points to start saving on your ${rand(BASE_MONTHLY_PREMIUM)} premium.`}
          </p>
        </article>

        <article className="tile">
          <h2>Next 1% off</h2>
          {nextProgress === null || toNext === null ? (
            <>
              <p className="big">Maximum</p>
              <p className="muted">You have reached the {MAX_DISCOUNT_PERCENT}% discount cap.</p>
            </>
          ) : (
            <>
              <p className="big">{toNext}<small> points to go</small></p>
              <div className="meter" role="img" aria-label={`${nextProgress} of ${POINTS_PER_PERCENT} points towards the next 1%`}>
                <span style={{ width: `${nextProgress}%` }} />
              </div>
            </>
          )}
        </article>
      </section>

      <section className="tile" aria-label="Progress to the maximum discount">
        <h2>Progress to {MAX_DISCOUNT_PERCENT}% off</h2>
        <div className="risk-top">
          <span>{discount}% of {MAX_DISCOUNT_PERCENT}%</span>
          <strong>{capProgress}%</strong>
        </div>
        <div className="meter" role="img" aria-label={`${capProgress} percent of the way to the maximum discount`}>
          <span style={{ width: `${capProgress}%` }} />
        </div>
      </section>

      <section className="dash-grid two" aria-label="Earning and history">
        <article className="tile">
          <h2>How to earn points</h2>
          <ul className="earn">
            {EARN_RULES.map((rule) => (
              <li key={rule.behaviour}>
                <div>
                  <strong>{rule.behaviour}</strong>
                  <span className="muted">{rule.tip}</span>
                </div>
                <span className="earn-points">{rule.points}</span>
              </li>
            ))}
          </ul>
          <button type="button" className="primary" onClick={() => onNavigate('advisor')}>
            Earn points with Trip Advisor
          </button>
        </article>

        <article className="tile">
          <h2>Activity</h2>
          {ledger.length === 0 && opening === 0 && (
            <p className="muted">
              No points yet. Run a Trip Advisor check and take the safer option to earn your first points.
            </p>
          )}
          <ul className="ledger">
            {ledger.map((entry) => (
              <li key={entry.id}>
                <div>
                  <strong>{entry.reason}</strong>
                  <span className="muted">{entry.when}</span>
                </div>
                <span className="earn-points">+{entry.points}</span>
              </li>
            ))}
            {opening > 0 && (
              <li>
                <div>
                  <strong>Earlier activity</strong>
                  <span className="muted">Before this week</span>
                </div>
                <span className="earn-points">+{opening.toLocaleString('en-ZA')}</span>
              </li>
            )}
          </ul>
        </article>
      </section>
    </DashboardLayout>
  )
}