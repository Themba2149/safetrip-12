import { useEffect, useState } from 'react'
import { loadPilotTotals } from '../lib/rewardsApi'
import type { PilotTotals } from '../lib/rewardsApi'
import { followRate } from '../data/portfolio'

const SCENARIO_LABEL: Record<string, string> = {
  rain: 'Heavy rain',
  hail: 'Hail warning',
  accident: 'Accident ahead',
}

// Real totals from the database. No names, no places.
export default function LivePilotTile() {
  const [totals, setTotals] = useState<PilotTotals | null>(null)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    let cancelled = false
    loadPilotTotals().then((result) => {
      if (cancelled) return
      if (result.error) setError(result.error)
      else setTotals(result.totals)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section className="tile" aria-label="Live pilot activity">
      <h2>
        Live pilot activity <span className="live-tag">Live data</span>
      </h2>

      {error && (
        <p className="error-box" role="alert">
          {error}
        </p>
      )}
      {!error && totals === null && <p className="muted">Loading live totals…</p>}

      {totals && (
        <>
          <ul className="live-stats">
            <li>
              <strong>{totals.drivers_with_profile}</strong>
              <span className="muted">Drivers with a profile</span>
            </li>
            <li>
              <strong>{totals.drivers_sharing}</strong>
              <span className="muted">Sharing details with insurer</span>
            </li>
            <li>
              <strong>{totals.checks_total}</strong>
              <span className="muted">Trip Advisor checks</span>
            </li>
            <li>
              <strong>{Number(totals.points_awarded).toLocaleString('en-ZA')}</strong>
              <span className="muted">Points awarded</span>
            </li>
          </ul>

          <div className="dash-grid two">
            <div>
              <h2>Warnings followed</h2>
              {totals.alerts.length === 0 ? (
                <p className="muted">No warnings yet. They appear when drivers check a risky trip.</p>
              ) : (
                <ul className="ledger">
                  {totals.alerts.map((alert) => (
                    <li key={alert.scenario}>
                      <div>
                        <strong>{SCENARIO_LABEL[alert.scenario] ?? alert.scenario}</strong>
                        <span className="muted">
                          {alert.sent} warned · {alert.followed} followed
                        </span>
                      </div>
                      <span className="earn-points">{followRate(alert.sent, alert.followed)}%</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h2>Drivers by discount earned</h2>
              {totals.tiers.length === 0 ? (
                <p className="muted">No points earned yet.</p>
              ) : (
                <ul className="ledger">
                  {totals.tiers.map((tier) => (
                    <li key={tier.percent}>
                      <div>
                        <strong>{tier.percent}% off</strong>
                        <span className="muted">
                          {tier.drivers} {tier.drivers === 1 ? 'driver' : 'drivers'}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <p className="muted small-print">Totals only. No driver names and no trip locations are stored here.</p>
        </>
      )}
    </section>
  )
}