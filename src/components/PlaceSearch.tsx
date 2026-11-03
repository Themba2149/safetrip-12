import { useRef, useState } from 'react'
import type { ChangeEvent, KeyboardEvent } from 'react'
import { searchPlaces } from '../lib/mapApi'
import type { Place } from '../data/routing'

type Props = {
  id: string
  label: string
  value: Place | null
  onChange: (place: Place | null) => void
  error?: string
  placeholder?: string
  allowMyLocation?: boolean
}

export default function PlaceSearch({
  id,
  label,
  value,
  onChange,
  error = '',
  placeholder,
  allowMyLocation = false,
}: Props) {
  const [query, setQuery] = useState<string>('')
  const [results, setResults] = useState<Place[]>([])
  const [searching, setSearching] = useState<boolean>(false)
  const [message, setMessage] = useState<string>('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function runSearch() {
    setMessage('')
    setResults([])
    setSearching(true)
    const found = await searchPlaces(query)
    setSearching(false)
    if (found.error) setMessage(found.error)
    else setResults(found.places)
  }

  function choose(place: Place) {
    onChange(place)
    setResults([])
    setMessage('')
    setQuery('')
  }

  function clear() {
    onChange(null)
    setQuery('')
    window.setTimeout(() => inputRef.current?.focus(), 0)
  }

  function useMyLocation() {
    setMessage('')
    if (!('geolocation' in navigator)) {
      setMessage('Your browser cannot share its location. Search for a place instead.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => choose({ label: 'My location', lat: position.coords.latitude, lon: position.coords.longitude }),
      () => setMessage('We could not get your location. Allow location access, or search for a place instead.'),
      { timeout: 10_000 },
    )
  }

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>

      {value ? (
        <div className="place-chip">
          <strong>{value.label}</strong>
          <button type="button" className="link-button" onClick={clear}>
            Change
          </button>
        </div>
      ) : (
        <>
          <div className="place-search">
            <input
              id={id}
              ref={inputRef}
              type="text"
              value={query}
              placeholder={placeholder}
              autoComplete="off"
              onChange={(event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)}
              onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  void runSearch()
                }
              }}
              aria-invalid={error ? 'true' : 'false'}
              aria-describedby={error ? `${id}-error` : undefined}
            />
            <button type="button" className="secondary" disabled={searching} onClick={() => void runSearch()}>
              {searching ? 'Searching…' : 'Search'}
            </button>
          </div>

          {allowMyLocation && (
            <button type="button" className="link-button left" onClick={useMyLocation}>
              Use my location
            </button>
          )}

          {results.length > 0 && (
            <ul className="place-results" aria-label={`${label} results`}>
              {results.map((place) => (
                <li key={`${place.lat},${place.lon}`}>
                  <button type="button" onClick={() => choose(place)}>
                    {place.label}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {message && (
            <p className="note" role="status">
              {message}
            </p>
          )}
        </>
      )}

      {error && (
        <p id={`${id}-error`} className="error">
          {error}
        </p>
      )}
    </div>
  )
}