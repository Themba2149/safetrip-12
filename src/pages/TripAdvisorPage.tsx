import { useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import type { User } from '@supabase/supabase-js'
import CarCheck from '../components/CarCheck'
import DashboardLayout from '../components/DashboardLayout'
import type { Page } from '../components/DashboardLayout'
import PlaceSearch from '../components/PlaceSearch'
import RoadSafetyCard from '../components/RoadSafetyCard'
import TripMap from '../components/TripMap'
import { DEPARTURES, DEPARTURE_LABEL, SCENARIOS, assess } from '../data/advisor'
import type { Action, Advice, Departure, Level, Scenario, TripInput } from '../data/advisor'
import {
  HOTSPOT_ZONES,
  carCheck,
  carMeasure,
  departureTime,
  hijackMeasure,
  trafficMeasure,
  zonesNearRoute,
} from '../data/roadSafety'
import type { CarAnswer, CarAnswers, CarCheck as CarCheckResult, CarCheckKey } from '../data/roadSafety'
import {
  departureOptions,
  formatDistance,
  formatDuration,
  rankRoutes,
  recommendTrip,
  riskLevel,
  validatePlaces,
} from '../data/routing'
import type { DepartureOption, Place, RankedRoute } from '../data/routing'
import { describeHour, liveDepartureOptions, scenarioFor } from '../data/weather'
import type { WeatherForecast } from '../data/weather'
import { entryFromRow } from '../data/wallet'
import type { LedgerEntry } from '../data/wallet'
import { fetchRoutes } from '../lib/mapApi'
import { addAdvisorCheck, claimAdvice } from '../lib/rewardsApi'
import { fetchWeather } from '../lib/weatherApi'

type Props = {
  user: User
  points: number
  onEarned: (entry: LedgerEntry) => void
  onNavigate: (page: Page) => void
}

type Source = 'live' | 'demo'
type Result = {
  advice: Advice
  summary: string
  departures: DepartureOption[]
  forecast: WeatherForecast | null
  weatherNote: string
  when: Date
  trafficLevel: Level
  car: CarCheckResult
  carAnswers: CarAnswers
}

const LEVEL_TEXT: Record<Level, string> = { low: 'Low', medium: 'Medium', high: 'High' }
const ACTION_TEXT: Record<Action, string> = {
  'travel-now': 'Travel',
  wait: 'Wait',
  reroute: 'Take another route',
  avoid: 'Avoid travel',
}
const HOUR_LABELS = ['Now', 'In 1 hour', 'In 2 hours']

export default function TripAdvisorPage({ user, points, onEarned, onNavigate }: Props) {
  const meta = user.user_metadata as { full_name?: string } | undefined
  const fullName = meta?.full_name || user.email || 'Driver'

  const [fromPlace, setFromPlace] = useState<Place | null>(null)
  const [toPlace, setToPlace] = useState<Place | null>(null)
  const [departure, setDeparture] = useState<Departure>('now')
  const [source, setSource] = useState<Source>('live')
  const [scenario, setScenario] = useState<Scenario>('clear')
  const [longTrip, setLongTrip] = useState<boolean>(false)
  const [serviceOverdue, setServiceOverdue] = useState<boolean>(false)
  const [carAnswers, setCarAnswers] = useState<CarAnswers>({})
  const [submitted, setSubmitted] = useState<boolean>(false)
  const [checking, setChecking] = useState<boolean>(false)

  const [result, setResult] = useState<Result | null>(null)
  const [routes, setRoutes] = useState<RankedRoute[]>([])
  const [routesError, setRoutesError] = useState<string>('')
  const [loadingRoutes, setLoadingRoutes] = useState<boolean>(false)
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null)

  const [checkId, setCheckId] = useState<string | null>(null)
  const [recording, setRecording] = useState<boolean>(false)
  const [claiming, setClaiming] = useState<boolean>(false)
  const [claimed, setClaimed] = useState<boolean>(false)
  const [declined, setDeclined] = useState<boolean>(false)
  const [claimError, setClaimError] = useState<string>('')
  const requestRef = useRef<number>(0)

  const placeErrors = validatePlaces(fromPlace, toPlace)
  const fromError = submitted ? placeErrors.from : ''
  const toError = submitted ? placeErrors.to : ''

  // Points are only for following the recommendation. If routes are shown, the recommended one must be selected.
  const recommendedRoute = routes.find((route) => route.recommended) ?? null
  const selectedRoute = routes.find((route) => route.id === selectedRouteId) ?? null
  const followsRecommendation = routes.length === 0 || selectedRoute?.recommended === true

  // How safe the road is. Hijacking looks at the route the driver has selected on the map.
  const road = result
    ? {
        traffic: trafficMeasure(result.trafficLevel, result.when),
        hijack: hijackMeasure(
          result.when,
          zonesNearRoute(selectedRoute?.path ?? [], HOTSPOT_ZONES),
          HOTSPOT_ZONES.length > 0,
        ),
        car: carMeasure(result.car, result.carAnswers),
      }
    : null

  function handleCarAnswer(key: CarCheckKey, answer: CarAnswer) {
    setCarAnswers((current) => ({ ...current, [key]: answer }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitted(true)
    if (placeErrors.from || placeErrors.to || !fromPlace || !toPlace) {
      document.getElementById(placeErrors.from ? 'from' : 'to')?.focus()
      return
    }

    const requestId = ++requestRef.current
    setChecking(true)

    // Live weather for the starting place. If it fails, we fall back to the demo scenario.
    let forecast: WeatherForecast | null = null
    let weatherNote = ''
    if (source === 'live') {
      const weather = await fetchWeather(fromPlace)
      if (requestRef.current !== requestId) return
      forecast = weather.forecast
      if (weather.error) weatherNote = `${weather.error} We used the demo scenario "${scenario}" instead.`
    }
    setChecking(false)

    // The quick car check feeds the vehicle risk: anything needing attention counts like an overdue service.
    const car = carCheck(carAnswers, serviceOverdue)
    const input: TripInput = {
      from: fromPlace.label,
      to: toPlace.label,
      departure,
      scenario: forecast ? scenarioFor(forecast, departure) : scenario,
      longTrip,
      serviceOverdue: serviceOverdue || car.attention.length > 0,
    }
    const advice = assess(input)
    const departures = forecast ? liveDepartureOptions(input, forecast) : departureOptions(input)
    const bestDeparture = departures.find((item) => item.recommended) ?? departures[0]
    const trafficLevel = advice.factors.find((factor) => factor.key === 'traffic')?.level ?? 'low'

    setResult({
      advice,
      departures,
      forecast,
      weatherNote,
      summary: `${fromPlace.label} to ${toPlace.label} · ${DEPARTURE_LABEL[departure]}`,
      when: departureTime(new Date(), departure),
      trafficLevel,
      car,
      carAnswers: { ...carAnswers },
    })
    setClaimed(false)
    setDeclined(false)
    setClaimError('')
    setCheckId(null)
    setRoutes([])
    setRoutesError('')
    setSelectedRouteId(null)
    setRecording(true)
    setLoadingRoutes(true)

    // Record the check (scenario and advice only, never the places) so the advice can be claimed once.
    void addAdvisorCheck({
      userId: user.id,
      scenario: input.scenario,
      departure,
      action: advice.action,
      riskScore: advice.riskScore,
      longTrip,
    }).then((saved) => {
      if (requestRef.current !== requestId) return
      setRecording(false)
      setCheckId(saved.id)
      if (saved.error) setClaimError(`We could not record this check, so points cannot be claimed. ${saved.error}`)
    })

    // Look up the driving routes for the map.
    void fetchRoutes(fromPlace, toPlace).then((found) => {
      if (requestRef.current !== requestId) return
      setLoadingRoutes(false)
      if (found.error) {
        setRoutesError(found.error)
        return
      }
      const ranked = rankRoutes(found.routes, bestDeparture.riskScore, bestDeparture.action === 'reroute')
      setRoutes(ranked)
      setSelectedRouteId(ranked.find((route) => route.recommended)?.id ?? null)
    })
  }

  async function handleClaim() {
    if (!result || !checkId || claimed || claiming || !followsRecommendation) return
    setClaiming(true)
    setClaimError('')
    const response = await claimAdvice(checkId)
    setClaiming(false)
    if (response.error || !response.row) {
      setClaimError(response.error || 'We could not add your points. Try again.')
      return
    }
    onEarned(entryFromRow(response.row))
    setClaimed(true)
  }

  return (
    <DashboardLayout name={fullName} current="advisor" onNavigate={onNavigate}>
      <div className="dash-title">
        <h1>Trip Advisor</h1>
        <p>Check the risk before you drive. We advise, you decide.</p>
      </div>

      <div className="advisor">
        <form className="tile" noValidate onSubmit={handleSubmit}>
          <h2>Your trip</h2>

          <PlaceSearch
            id="from"
            label="From"
            value={fromPlace}
            onChange={setFromPlace}
            error={fromError}
            placeholder="Search a place, like Sandton City"
            allowMyLocation
          />

          <PlaceSearch
            id="to"
            label="To"
            value={toPlace}
            onChange={setToPlace}
            error={toError}
            placeholder="Search a place, like Menlyn Park"
          />

          <div className="field">
            <label htmlFor="departure">Leaving</label>
            <select
              id="departure"
              value={departure}
              onChange={(event: ChangeEvent<HTMLSelectElement>) => setDeparture(event.target.value as Departure)}
            >
              {DEPARTURES.map((value) => (
                <option key={value} value={value}>
                  {DEPARTURE_LABEL[value]}
                </option>
              ))}
            </select>
          </div>

          <fieldset className="source-toggle">
            <legend>Conditions</legend>
            <label className={source === 'live' ? 'chip on' : 'chip'}>
              <input
                type="radio"
                name="source"
                value="live"
                checked={source === 'live'}
                onChange={() => setSource('live')}
              />
              <span>
                <strong>Live weather</strong>
                <small>Real forecast for where you leave from</small>
              </span>
            </label>
            <label className={source === 'demo' ? 'chip on' : 'chip'}>
              <input
                type="radio"
                name="source"
                value="demo"
                checked={source === 'demo'}
                onChange={() => setSource('demo')}
              />
              <span>
                <strong>Demo scenario</strong>
                <small>For presentations</small>
              </span>
            </label>
          </fieldset>

          <fieldset className="chips" disabled={source === 'live'}>
            <legend>Demo scenario</legend>
            {SCENARIOS.map((item) => (
              <label key={item.value} className={scenario === item.value ? 'chip on' : 'chip'}>
                <input
                  type="radio"
                  name="scenario"
                  value={item.value}
                  checked={scenario === item.value}
                  onChange={() => setScenario(item.value)}
                />
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.hint}</small>
                </span>
              </label>
            ))}
          </fieldset>

          <div className="field">
            <label className="consent" htmlFor="longTrip">
              <input
                id="longTrip"
                type="checkbox"
                checked={longTrip}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setLongTrip(event.target.checked)}
              />
              <span>This is a long trip (over 3 hours)</span>
            </label>
          </div>

          <div className="field">
            <label className="consent" htmlFor="serviceOverdue">
              <input
                id="serviceOverdue"
                type="checkbox"
                checked={serviceOverdue}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setServiceOverdue(event.target.checked)}
              />
              <span>My vehicle service is overdue</span>
            </label>
          </div>

          <CarCheck answers={carAnswers} onChange={handleCarAnswer} />

          <button type="submit" className="primary" disabled={checking}>
            {checking ? 'Checking the weather…' : 'Check my trip'}
          </button>
        </form>

        <div className="advisor-result">
          <section className="tile map-tile" aria-label="Map">
            <h2>Map</h2>
            <TripMap
              from={fromPlace}
              to={toPlace}
              routes={routes}
              selectedId={selectedRouteId}
              onSelect={setSelectedRouteId}
            />
            <p className="muted small-print">
              Search for a place, choose it from the list, then check your trip. The recommended route is drawn in
              yellow. Routes come from OpenStreetMap data.
            </p>
          </section>

          {!result && (
            <div className="tile empty">
              <h2>Your advice</h2>
              <p className="muted">
                Choose where you are going, then check your trip. Your recommended trip, how safe the road is and your
                options appear here.
              </p>
            </div>
          )}

          {result && (
            <>
              <section className={`tile result act-${result.advice.action}`} aria-live="polite">
                <h2>{result.summary}</h2>
                <p className="verdict">{result.advice.headline}</p>
                <p className="muted">{result.advice.detail}</p>

                {result.weatherNote && <p className="note">{result.weatherNote}</p>}

                {result.forecast && (
                  <ul className="weather-strip" aria-label="Live forecast for where you leave from">
                    {HOUR_LABELS.map((label, index) => {
                      const hour = result.forecast?.hours[index]
                      if (!hour) return null
                      return (
                        <li key={label}>
                          <strong>{label}</strong>
                          <span className="muted">{describeHour(hour)}</span>
                        </li>
                      )
                    })}
                  </ul>
                )}

                <div className="risk">
                  <div className="risk-top">
                    <span>Trip risk score</span>
                    <strong>{result.advice.riskScore} / 100</strong>
                  </div>
                  <div
                    className="meter"
                    role="img"
                    aria-label={`Trip risk score ${result.advice.riskScore} out of 100`}
                  >
                    <span style={{ width: `${result.advice.riskScore}%` }} />
                  </div>
                </div>

                <ul className="factors">
                  {result.advice.factors.map((factor) => (
                    <li key={factor.key}>
                      <div>
                        <strong>{factor.label}</strong>
                        <span className="muted">{factor.note}</span>
                      </div>
                      <span className={`lvl ${factor.level}`}>{LEVEL_TEXT[factor.level]}</span>
                    </li>
                  ))}
                </ul>

                {result.advice.extras.length > 0 && (
                  <ul className="extras">
                    {result.advice.extras.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                )}
              </section>

              {road && <RoadSafetyCard traffic={road.traffic} hijack={road.hijack} car={road.car} />}

              <section className="tile" aria-label="Recommended trip and options">
                <h2>Recommended trip</h2>
                <p className="recommend">{recommendTrip(result.departures, routes) || 'Working out your best option…'}</p>
                {recommendedRoute && (
                  <p className="muted">
                    Recommended route: <strong>{recommendedRoute.name}</strong> ·{' '}
                    {formatDuration(recommendedRoute.durationSec)} · {formatDistance(recommendedRoute.distanceM)} · risk{' '}
                    {recommendedRoute.risk}
                  </p>
                )}

                <div className="decision">
                  <h2>Your decision</h2>

                  {claimError && (
                    <p className="error-box" role="alert">
                      {claimError}
                    </p>
                  )}

                  {result.advice.points === 0 && (
                    <p className="muted">No points are on offer for this trip. Drive safely.</p>
                  )}

                  {result.advice.points > 0 && claimed && (
                    <p className="notice" role="status">
                      You followed the recommendation. Points added. You now have {points.toLocaleString('en-ZA')}.{' '}
                      <button type="button" className="link-button" onClick={() => onNavigate('rewards')}>
                        See your wallet
                      </button>
                    </p>
                  )}

                  {result.advice.points > 0 && !claimed && declined && (
                    <>
                      <p className="note" role="status">
                        Your choice. No points were awarded for this trip. We only advise, you decide.
                      </p>
                      <button type="button" className="link-button left" onClick={() => setDeclined(false)}>
                        Follow the recommendation instead
                      </button>
                    </>
                  )}

                  {result.advice.points > 0 && !claimed && !declined && (
                    <>
                      <p className="muted">
                        Follow the recommended trip to earn {result.advice.points} points. If you go your own way, you
                        keep your premium and earn no points for this trip.
                      </p>
                      {!followsRecommendation && (
                        <p className="note">
                          You selected a different route from the recommended one. Points are only awarded for
                          following the recommendation. Select the recommended route to earn them.
                        </p>
                      )}
                      <div className="decision-buttons">
                        <button
                          type="button"
                          className="primary"
                          disabled={recording || claiming || checkId === null || !followsRecommendation}
                          onClick={handleClaim}
                        >
                          {recording
                            ? 'Recording your check…'
                            : claiming
                              ? 'Adding your points…'
                              : `I will follow the recommendation (+${result.advice.points} pts)`}
                        </button>
                        <button type="button" className="secondary" onClick={() => setDeclined(true)}>
                          I will go my own way (no points)
                        </button>
                      </div>
                    </>
                  )}
                </div>

                <h2>Route options</h2>
                {loadingRoutes && <p className="muted">Finding routes…</p>}
                {routesError && <p className="note">{routesError}</p>}
                {!loadingRoutes && !routesError && routes.length === 1 && (
                  <p className="note">Only one route was found between these places.</p>
                )}
                {routes.length > 0 && (
                  <ul className="route-options">
                    {routes.map((route) => (
                      <li key={route.id}>
                        <button
                          type="button"
                          className={route.id === selectedRouteId ? 'route-card on' : 'route-card'}
                          aria-pressed={route.id === selectedRouteId ? 'true' : 'false'}
                          onClick={() => setSelectedRouteId(route.id)}
                        >
                          <div>
                            <strong>
                              {route.name}
                              {route.recommended && <span className="badge">Recommended</span>}
                              {route.fastest && <span className="badge fast">Fastest</span>}
                            </strong>
                            <span className="muted">
                              {formatDuration(route.durationSec)} · {formatDistance(route.distanceM)}
                              {route.extraMinutes > 0 ? ` · +${route.extraMinutes} min` : ''}
                            </span>
                          </div>
                          <span className={`lvl ${route.level}`}>Risk {route.risk}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <h2>Departure options</h2>
                <ul className="depart-options">
                  {result.departures.map((option) => (
                    <li key={option.departure} className={option.recommended ? 'on' : ''}>
                      <div>
                        <strong>
                          {option.label}
                          {option.recommended && <span className="badge">Recommended</span>}
                        </strong>
                        <span className="muted">{ACTION_TEXT[option.action]}</span>
                      </div>
                      <span className={`lvl ${riskLevel(option.riskScore)}`}>Risk {option.riskScore}</span>
                    </li>
                  ))}
                </ul>

                <p className="muted small-print">
                  {result.forecast
                    ? 'Weather is a live forecast for where you leave from (Open-Meteo). Traffic and route risk are still estimated.'
                    : 'Demo scenario, not live data.'}{' '}
                  Route risk is estimated from conditions and route length. AI supports your decision. It does not
                  replace the driver. In the live product, points are confirmed after the trip.
                </p>
              </section>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}