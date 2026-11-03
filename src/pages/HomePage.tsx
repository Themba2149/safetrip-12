import {
  AI_LAYERS,
  COMPARE,
  EARN_TABLE,
  FAQS,
  PILOT,
  SOURCES,
  STATS,
  STEPS,
} from '../data/landing'
type Props = {
  onSignIn: () => void
  onGetStarted: () => void
}

const NAV: { id: string; label: string }[] = [
  { id: 'top', label: 'Home' },
  { id: 'how', label: 'How it works' },
  { id: 'rewards', label: 'Rewards' },
  { id: 'safety', label: 'Safety' },
  { id: 'faq', label: 'FAQ' },
  { id: 'get-app', label: 'Get the app' },
]

function goTo(id: string) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  document.getElementById(id)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
}

export default function HomePage({ onSignIn, onGetStarted }: Props) {
  return (
    <div className="site" id="top">
      <header className="site-nav">
        <div className="site-nav-inner">
          <button type="button" className="site-brand" onClick={() => goTo('top')}>
            <img src="/safetrip-logo.svg" alt="" width="34" height="34" />
            <span>SafeTrip</span>
          </button>

          <nav className="site-links" aria-label="Sections">
            {NAV.map((item) => (
              <button key={item.id} type="button" onClick={() => goTo(item.id)}>
                {item.label}
              </button>
            ))}
          </nav>

          <div className="site-actions">
            <button type="button" className="secondary small" onClick={() => onSignIn()}>
              Sign in
            </button>
            <button type="button" className="primary small" onClick={onGetStarted}>
              Get started
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="site-hero">
          <div className="site-wrap hero-grid">
            <div>
              <p className="eyebrow">Prevention, not punishment</p>
              <h1>Your premium can only go down</h1>
              <p className="lead">
                SafeTrip warns you before a risky trip and rewards the safer choices you make. Insurance that helps you
                avoid the accident, not just pay for it.
              </p>
              <div className="hero-buttons">
                <button type="button" className="primary" onClick={onGetStarted}>
                  Create your account
                </button>
                <button type="button" className="secondary" onClick={() => goTo('how')}>
                  See how it works
                </button>
              </div>
              <p className="muted small-print">Prototype for the MTN Group Technology Hackathon 2026.</p>
            </div>

            <aside className="thandi" aria-label="Example driver">
              <p className="eyebrow">Meet Thandi (example)</p>
              <div className="thandi-grid">
                <div>
                  <strong>R850</strong>
                  <span>Monthly premium</span>
                </div>
                <div>
                  <strong>55 pts</strong>
                  <span>Rewards earned</span>
                </div>
                <div>
                  <strong>45 pts</strong>
                  <span>To next 1% off</span>
                </div>
              </div>
              <p className="verdict-line">Travel now · Wait · Reroute · Avoid travel</p>
              <p className="muted">
                Traditional insurance waits for an accident. SafeTrip helps Thandi avoid one.
              </p>
            </aside>
          </div>
        </section>

        <section className="site-band" aria-label="The gap">
          <div className="site-wrap">
            <h2>Behind the numbers: drivers nobody is serving</h2>
            <ul className="stat-grid">
              {STATS.map((item) => (
                <li key={item.value}>
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                </li>
              ))}
            </ul>
            <p className="muted small-print">{SOURCES}</p>
          </div>
        </section>

        <section className="site-section" id="how">
          <div className="site-wrap">
            <p className="eyebrow">How it works</p>
            <h2>Influencing the decision before the journey begins</h2>
            <ol className="steps">
              {STEPS.map((step, index) => (
                <li key={step.title}>
                  <span className="step-num">{index + 1}</span>
                  <h3>{step.title}</h3>
                  <p className="muted">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="site-section alt" id="rewards">
          <div className="site-wrap two-col">
            <div>
              <p className="eyebrow">Rewards</p>
              <h2>Safer choices earn points</h2>
              <p className="lead">
                100 points is 1% off, up to 15%. We reward safer choices. We never punish drivers.
              </p>
              <button type="button" className="primary" onClick={onGetStarted}>
                Start earning
              </button>
            </div>
            <table className="earn-table">
              <caption className="visually-hidden">Points for each safer choice</caption>
              <thead>
                <tr>
                  <th scope="col">Behaviour</th>
                  <th scope="col">Points</th>
                </tr>
              </thead>
              <tbody>
                {EARN_TABLE.map((row) => (
                  <tr key={row.action}>
                    <th scope="row">{row.action}</th>
                    <td>{row.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="site-section">
          <div className="site-wrap">
            <p className="eyebrow">Why it is different</p>
            <h2>Insurance reacts. Telematics scores. SafeTrip prevents.</h2>
            <div className="table-scroll">
              <table className="compare">
                <thead>
                  <tr>
                    <th scope="col"> </th>
                    <th scope="col">Traditional insurance</th>
                    <th scope="col">Telematics</th>
                    <th scope="col" className="us">
                      SafeTrip
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARE.map((row) => (
                    <tr key={row.topic}>
                      <th scope="row">{row.topic}</th>
                      <td>{row.traditional}</td>
                      <td>{row.telematics}</td>
                      <td className="us">{row.safetrip}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="site-section alt" id="safety">
          <div className="site-wrap">
            <p className="eyebrow">Safety and AI</p>
            <h2>Intelligence at every layer</h2>
            <p className="lead">AI supports decisions. AI does not replace the driver.</p>
            <ul className="layer-grid">
              {AI_LAYERS.map((layer) => (
                <li key={layer.name}>
                  <h3>{layer.name}</h3>
                  <ul>
                    {layer.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
            <p className="muted small-print">
              The prototype uses a live weather forecast today. Traffic, hazard and crash detection from the MTN network
              (5G Core and AI-RAN) are proposals to validate in the pilot.
            </p>
          </div>
        </section>

        <section className="site-band" aria-label="Pilot plan">
          <div className="site-wrap">
            <h2>Proposed pilot: prove it in Gauteng in six months</h2>
            <ul className="stat-grid">
              {PILOT.map((item) => (
                <li key={item.label}>
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                </li>
              ))}
            </ul>
            <p className="muted small-print">
              App screens use simulated data. Pilot targets are proposals to validate.
            </p>
          </div>
        </section>

        <section className="site-section" id="faq">
          <div className="site-wrap narrow">
            <p className="eyebrow">FAQ</p>
            <h2>Frequently asked questions</h2>
            <div className="faq">
              {FAQS.map((item) => (
                <details key={item.question}>
                  <summary>{item.question}</summary>
                  <p className="muted">{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="site-section alt" id="get-app">
          <div className="site-wrap site-app-download">
            <p className="eyebrow">SafeTrip on your phone</p>
            <h2>Take safer journeys with you</h2>
            <p className="lead">
              The SafeTrip mobile app is being prepared for drivers. You can use the web portal in the meantime.
            </p>
            <div className="hero-buttons center">
              <button type="button" className="secondary" disabled>
                Android app — coming soon
              </button>
              <button type="button" className="secondary" disabled>
                iPhone app — coming soon
              </button>
            </div>
          </div>
        </section>

        <section className="site-cta">
          <div className="site-wrap">
            <h2>Ready to drive safer and pay less?</h2>
            <p className="muted">Create a free account to explore the SafeTrip demonstration.</p>
            <div className="hero-buttons center">
              <button type="button" className="primary" onClick={onGetStarted}>
                Get started
              </button>
              <button type="button" className="secondary" onClick={() => onSignIn()}>
                Sign in
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="site-wrap footer-grid">
          <div>
            <p className="footer-brand">
              <img src="/safetrip-logo.svg" alt="" width="30" height="30" />
              <span>SafeTrip</span>
            </p>
            <p className="muted">Helping South Africans avoid risk.</p>
            <p className="muted">Johannesburg, South Africa</p>
          </div>
          <div>
            <h3>Product</h3>
            <button type="button" onClick={() => goTo('how')}>How it works</button>
            <button type="button" onClick={() => goTo('rewards')}>Rewards</button>
            <button type="button" onClick={() => goTo('safety')}>Safety and AI</button>
            <button type="button" onClick={() => goTo('get-app')}>Get the app</button>
          </div>
          <div>
            <h3>Access</h3>
            <button type="button" onClick={() => onSignIn()}>Driver sign-in</button>
            <button type="button" onClick={onGetStarted}>Create account</button>
          </div>
          <div>
            <h3>About</h3>
            <p className="muted">MTN Group Technology Hackathon 2026 prototype. Simulated data.</p>
            <p className="muted">Helping drivers avoid risk and pay less.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}