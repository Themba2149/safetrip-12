import { useEffect, useRef } from 'react'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Place, RankedRoute } from '../data/routing'

type Props = {
  from: Place | null
  to: Place | null
  routes: RankedRoute[]
  selectedId: string | null
  onSelect: (id: string) => void
}

const DEFAULT_CENTRE: L.LatLngTuple = [-26.2, 28.05] // Gauteng, where the pilot runs

// Simple round pins drawn with CSS, so no image files are needed.
function pin(letter: string, kind: 'start' | 'end'): L.DivIcon {
  return L.divIcon({ className: `map-pin ${kind}`, html: letter, iconSize: [30, 30], iconAnchor: [15, 15] })
}

export default function TripMap({ from, to, routes, selectedId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)

  // Create the map once.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const map = L.map(container, { scrollWheelZoom: false }).setView(DEFAULT_CENTRE, 9)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map)
    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Draw the pins and routes. The chosen route is drawn last, so it sits on top.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const group = L.layerGroup().addTo(map)

    const ordered = [...routes].sort((a, b) => Number(a.id === selectedId) - Number(b.id === selectedId))
    for (const route of ordered) {
      const selected = route.id === selectedId
      const line = L.polyline(route.path, {
        color: selected ? '#FFCC00' : '#9AA6B5',
        weight: selected ? 6 : 4,
        opacity: selected ? 0.95 : 0.7,
      })
      line.on('click', () => onSelect(route.id))
      line.addTo(group)
    }
    if (from) L.marker([from.lat, from.lon], { icon: pin('A', 'start'), title: from.label }).addTo(group)
    if (to) L.marker([to.lat, to.lon], { icon: pin('B', 'end'), title: to.label }).addTo(group)

    return () => {
      group.remove()
    }
  }, [from, to, routes, selectedId, onSelect])

  // Zoom to fit when the places or routes change (not when the driver just picks another route).
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const bounds = L.latLngBounds([])
    if (from) bounds.extend([from.lat, from.lon])
    if (to) bounds.extend([to.lat, to.lon])
    for (const route of routes) for (const point of route.path) bounds.extend(point)
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 })
  }, [from, to, routes])

  return <div ref={containerRef} className="trip-map" role="application" aria-label="Trip map" />
}