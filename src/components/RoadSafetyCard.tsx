import { highestConcern, networkInsight } from '../data/roadSafety'
import type { Measure } from '../data/roadSafety'
import type { Level } from '../data/advisor'

type Props = {
  traffic: Measure
  hijack: Measure
  car: Measure
}

const LEVEL_TEXT: Record<Level, string> = { low: 'Low', medium: 'Medium', high: 'High' }

export default function RoadSafetyCard({ traffic, hijack, car }: Props) {
  const measures = [traffic, hijack, car]
  const worst = highestConcern(measures)
  const network = networkInsight(traffic.score)

  return (
    <section className="tile road-safety" aria-label="How safe is this road">
      <h2>How safe is this road?</h2>
      {worst && (
        <p className="muted">
          Look at <strong>{worst.label.toLowerCase()}</strong> first: {LEVEL_TEXT[worst.level].toLowerCase()} risk.
        </p>
      )}

      <ul className="measures">
        {measures.map((measure) => (
          <li key={measure.key} className={`measure ${measure.level}`}>
            <div className="measure-head">
              <strong>{measure.label}</strong>
              <span className={`lvl ${measure.level}`}>{LEVEL_TEXT[measure.level]}</span>
            </div>
            <div className="meter" role="img" aria-label={`${measure.label} risk ${measure.score} out of 100`}>
              <span style={{ width: `${measure.score}%` }} />
            </div>
            <p className="muted">{measure.summary}</p>

            {measure.key === 'traffic' && (
              <div className="network">
                <div className="network-head">
                  <strong>Network insight</strong>
                  <span className="tag">Simulated</span>
                </div>
                <dl>
                  <div>
                    <dt>Congestion</dt>
                    <dd>{network.congestionPercent}%</dd>
                  </div>
                  <div>
                    <dt>Average speed</dt>
                    <dd>{network.averageSpeedKmh} km/h</dd>
                  </div>
                </dl>
                <p className="muted small-print">
                  Shaped like the signals an operator could expose through network APIs. Not live data.
                </p>
              </div>
            )}

            <ul className="tips">
              {measure.tips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </li>
        ))}
      </ul>

      <p className="muted small-print">
        These are estimates to help you decide. They are not live traffic or crime data, and no road is risk free.
      </p>
    </section>
  )
}