import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import DashboardLayout from '../components/DashboardLayout'
import type { Page } from '../components/DashboardLayout'
import { DEPARTURE_LABEL, SCENARIOS } from '../data/advisor'
import type { Action } from '../data/advisor'
import { summarizeChecks } from '../data/checks'
import type { CheckRow } from '../data/checks'
import {
  BASE_MONTHLY_PREMIUM,
  discountPercent,
  discountedPremium,
  pointsToNextPercent,
  scoreBand,
} from '../data/mockDriver'
import { coverLabel, hasInsurance, isProfileComplete } from '../data/profile'
import type { Profile } from '../data/profile'
import CoverCard from '../components/CoverCard'
import { riskLevel } from '../data/routing'
import { formatWhen } from '../data/wallet'
import { loadAdvisorChecks } from '../lib/checksApi'

type Props = {
  user: User
  justVerified: boolean
  profile: Profile | null
  profileStatus: 'loading' | 'ready' | 'error'
  points: number
  onNavigate: (page: Page) => void
}

const RING_RADIUS = 52
const RING_LENGTH = 2 * Math.PI * RING_RADIUS

const ACTION_TEXT: Record<Action, string> = {
  'travel-now': 'Travel',
  wait: 'Wait',
  reroute: 'Take another route',
  avoid: 'Avoid travel',
}

const SCENARIO_TEXT: Record<string, string> = Object.fromEntries(SCENARIOS.map((item) => [item.value, item.label]))
const RISK_TONE = { low: 'good', medium: 'ok', high: 'low' } as const

function rand(value: number): string {
  return `R${value.toLocaleString('en-ZA')}`
}

export default function DashboardPage({ user, justVerified, profile, profileStatus, points, onNavigate }: Props) {
  const meta = user.user_metadata as { full_name?: string } | undefined
  const fullName = meta?.full_name || user.email || 'Driver'
  const firstName = fullName.split(' ')[0]

  const [checks, setChecks] = useState<CheckRow[]>([])
  const [checksStatus, setChecksStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [checksError, setChecksError] = useState<string>('')

  // Load the driver's real advice checks each time the dashboard opens.
  useEffect(() => {
    let cancelled = false
    loadAdvisorChecks().then(({ rows, error }) => {
      if (cancelled) return
      if (error) {
        setChecksError(error)
        setChecksStatus('error')
        return
      }
      setChecks(rows)
      setChecksStatus('ready')
    })
    return () => {
      cancelled = true
    }
  }, [])

  const summary = summarizeChecks(checks)
  const score = summary.score
  const band = score === null ? null : scoreBand(score)
  const discount = discountPercent(points)
  const premium = discountedPremium(points)
  const saving = BASE_MONTHLY_PREMIUM - premium
  const toNext = pointsToNextPercent(points)

  return (
    <DashboardLayout name={fullName} current="overview" onNavigate={onNavigate}>
      <p className="notice" role="status" hidden={!justVerified}>
        Your email address is verified. Welcome to SafeTrip Rewards.
      </p>

      {profileStatus === 'ready' && profile && !isProfileComplete(profile) && (
        <article className="tile setup">
          <h2>Finish setting up</h2>
          <p className="advice-main">Add your details and your car.</p>
          <p className="muted">
            Your profile unlocks your cover details and lets your insurer support you. It takes about two minutes.
          </p>
          <button type="button" className="primary" onClick={() => onNavigate('profile')}>
            Set up profile
          </button>
        </article>
      )}

      <div className="dash-title">
        <h1>Hello, {firstName}</h1>
        <p>Here is how your safe choices look.</p>
      </div>

      {checksStatus === 'error' && (
        <p className="error-box" role="alert">
          We could not load your checks. {checksError}
        </p>
      )}

      <section className="dash-grid" aria-label="Summary">
        <article className="tile score-tile">
          <h2>Safe-choice score</h2>
          <div className="ring-wrap">
            <svg
              viewBox="0 0 120 120"
              width="140"
              height="140"
              role="img"
              aria-label={score === null ? 'No safe-choice score yet' : `Safe-choice score ${score} out of 100`}
            >
              <circle cx="60" cy="60" r={RING_RADIUS} className="ring-track" />
              {score !== null && band && (
                <circle
                  cx="60"
                  cy="60"
                  r={RING_RADIUS}
                  className={`ring-value ${band.tone}`}
                  strokeDasharray={RING_LENGTH}
                  strokeDashoffset={RING_LENGTH * (1 - score / 100)}
                  transform="rotate(-90 60 60)"
                />
              )}
            </svg>
            <div className="ring-number">
              <strong>{score === null ? '–' : score}</strong>
              <span>/ 100</span>
            </div>
          </div>
          {band ? (
            <p className={`band ${band.tone}`}>{band.label}</p>
          ) : (
            <p className="muted">
              {checksStatus === 'loading'
                ? 'Loading…'
                : 'No score yet. It appears after your first check where the advice is to wait, reroute or avoid.'}
            </p>
          )}
          <p className="muted small-print">The share of safer options you chose when we advised caution.</p>
        </article>

        <article className="tile">
          <h2>Your premium</h2>
          <p className="big">
            {rand(premium)}
            <small> / month</small>
          </p>
          <p className="muted">
            {discount > 0
              ? `You are saving ${rand(saving)} a month (${discount}% off ${rand(BASE_MONTHLY_PREMIUM)}).`
              : `No discount yet. Your premium stays at ${rand(BASE_MONTHLY_PREMIUM)}; it never goes up.`}
            {toNext !== null ? ` ${toNext} points to your next 1% off.` : ' You have reached the maximum 15% discount.'}
          </p>
          {profile && hasInsurance(profile) ? (
            <p className="muted">
              Insured with <strong>{profile.insurer}</strong>
              {profile.coverType ? ` · ${coverLabel(profile.coverType)}` : ''}
            </p>
          ) : (
            <p className="muted">
              No insurer added yet.{' '}
              <button type="button" className="link-button" onClick={() => onNavigate('profile')}>
                Add your insurance
              </button>
            </p>
          )}
          <p className="promise">Your premium can only go down.</p>
        </article>

        <article className="tile">
          <h2>Reward points</h2>
          <p className="big">{points.toLocaleString('en-ZA')}</p>
          <p className="muted">100 points = 1% off, up to 15%.</p>
          <button type="button" className="link-button" onClick={() => onNavigate('rewards')}>
            See your wallet
          </button>
        </article>
      </section>

   <CoverCard profile={profileStatus === 'ready' ? profile : null} userId={user.id} label={fullName} onNavigate={onNavigate} />
      <section className="dash-grid two" aria-label="Details">
        <article className="tile">
          <h2>Last 6 weeks</h2>
          <ul className="mini-stats" aria-label="Your totals">
            <li>
              <strong>{summary.total}</strong>
              <span>Trips checked</span>
            </li>
            <li>
              <strong>
                {summary.followed} / {summary.decisions}
              </strong>
              <span>Safer options taken</span>
            </li>
            <li>
              <strong>{summary.averageRisk === null ? '–' : summary.averageRisk}</strong>
              <span>Average risk</span>
            </li>
          </ul>
          <ul className="bars" aria-label="Weekly safe-choice scores">
            {summary.weeks.map((week) => (
              <li key={week.label}>
                <span className="bar-value">{week.score === null ? '–' : week.score}</span>
                <span className="bar" style={{ height: `${week.score ?? 0}%` }} />
                <span className="bar-label">{week.label}</span>
              </li>
            ))}
          </ul>
        </article>

        <article className="tile advice">
          <h2>Before your next trip</h2>
          <p className="advice-main">Check the risk before you drive.</p>
          <p className="muted">
            Trip Advisor looks at weather, traffic, route risk and your vehicle, then tells you whether to
            travel, wait, reroute or avoid the trip. Safer choices earn points.
          </p>
          <button type="button" className="primary" onClick={() => onNavigate('advisor')}>
            Open Trip Advisor
          </button>
        </article>
      </section>

      <section className="tile" aria-label="Recent checks">
        <h2>Recent trip checks</h2>
        {checksStatus === 'ready' && checks.length === 0 && (
          <p className="muted">
            No checks yet. Open Trip Advisor and check a trip. It will show up here.
          </p>
        )}
        {checks.length > 0 && (
          <ul className="trips">
            {checks.slice(0, 6).map((check) => (
              <li key={check.id}>
                <div className="trip-main">
                  <strong>{ACTION_TEXT[check.action]}</strong>
                  <span className="muted">
                    {formatWhen(check.created_at)} · {DEPARTURE_LABEL[check.departure]} ·{' '}
                    {SCENARIO_TEXT[check.scenario] ?? check.scenario}
                  </span>
                  <span className="muted">
                    {check.followed
                      ? 'You took the safer option.'
                      : check.action === 'travel-now'
                        ? 'Conditions were fine to travel.'
                        : 'Safer option not taken yet.'}
                  </span>
                </div>
                <div className="trip-side">
                  <span className={`pill ${RISK_TONE[riskLevel(check.risk_score)]}`}>{check.risk_score}</span>
                  <span className="muted">risk</span>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="muted small-print">
          Places are never saved. Only the conditions, the advice and your choice are kept. Driving-sensor scores
          arrive with the network data in the pilot.
        </p>
      </section>
    </DashboardLayout>
  )
}