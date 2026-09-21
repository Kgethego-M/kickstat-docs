import { useEffect, useMemo, useRef, useState } from 'react'
import './VenueMapEditor.css'

// Editable venue map — a small, dependency-free slippy map built on
// OpenStreetMap's raster tiles (no API key or account needed, same source the
// read-only venue map already links to). The coach clicks the pitch to drop
// the pin, drags the pin to fine-tune it, drags the map to pan and uses the
// zoom buttons to get closer.
//
// `latitude`/`longitude` are the saved pin (controlled by the parent form);
// `onChange({ lat, lng })` reports a new pin, or `{ lat: null, lng: null }`
// when it is cleared.

const TILE_SIZE = 256
const MIN_ZOOM = 3
const MAX_ZOOM = 18
// Johannesburg city centre — a sensible opening view before anything is pinned.
const DEFAULT_CENTER = { lat: -26.2041, lng: 28.0473 }
// Treat a pointer press that barely moves as a click (place/move the pin)
// rather than a pan gesture.
const CLICK_SLOP_PX = 4
const PIN_GRAB_PX = 16

function clampLat(lat) {
  return Math.max(-85.0511, Math.min(85.0511, lat))
}

// Web-Mercator world pixel coordinates for a lat/lng at a given zoom.
function project(lat, lng, zoom) {
  const scale = TILE_SIZE * 2 ** zoom
  const sin = Math.sin((clampLat(lat) * Math.PI) / 180)
  return {
    x: ((lng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale,
  }
}

function unproject(x, y, zoom) {
  const scale = TILE_SIZE * 2 ** zoom
  const n = Math.PI - (2 * Math.PI * y) / scale
  return {
    lat: (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))),
    lng: (x / scale) * 360 - 180,
  }
}

function toCoord(value) {
  if (value === null || value === undefined || value === '') return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

export default function VenueMapEditor({ latitude, longitude, label, onChange }) {
  const pinLat = toCoord(latitude)
  const pinLng = toCoord(longitude)
  const hasPin = pinLat !== null && pinLng !== null

  const [center, setCenter] = useState(() => (hasPin ? { lat: pinLat, lng: pinLng } : DEFAULT_CENTER))
  const [zoom, setZoom] = useState(hasPin ? 15 : 12)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [hint, setHint] = useState('')

  const containerRef = useRef(null)
  const dragRef = useRef(null)

  // The canvas is fluid — measure it so the tiles can cover it exactly.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight })
    measure()
    let observer = null
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(measure)
      observer.observe(el)
    }
    window.addEventListener('resize', measure)
    return () => {
      if (observer) observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [])

  const centerPx = project(center.lat, center.lng, zoom)
  const originX = centerPx.x - size.w / 2
  const originY = centerPx.y - size.h / 2

  const tiles = useMemo(() => {
    if (!size.w || !size.h) return []
    const tileCount = 2 ** zoom
    const minTX = Math.floor(originX / TILE_SIZE)
    const maxTX = Math.floor((originX + size.w) / TILE_SIZE)
    const minTY = Math.max(0, Math.floor(originY / TILE_SIZE))
    const maxTY = Math.min(tileCount - 1, Math.floor((originY + size.h) / TILE_SIZE))
    const out = []
    for (let tx = minTX; tx <= maxTX; tx++) {
      const wrappedX = ((tx % tileCount) + tileCount) % tileCount
      for (let ty = minTY; ty <= maxTY; ty++) {
        out.push({
          key: `${zoom}/${wrappedX}/${ty}@${tx}`,
          url: `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${ty}.png`,
          left: tx * TILE_SIZE - originX,
          top: ty * TILE_SIZE - originY,
        })
      }
    }
    return out
  }, [originX, originY, size, zoom])

  const pinScreen = hasPin
    ? (() => {
        const px = project(pinLat, pinLng, zoom)
        return { x: px.x - originX, y: px.y - originY }
      })()
    : null

  function placePinAt(clientX, clientY) {
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const point = unproject(originX + (clientX - rect.left), originY + (clientY - rect.top), zoom)
    onChange({ lat: Number(point.lat.toFixed(6)), lng: Number(point.lng.toFixed(6)) })
  }

  function handlePointerDown(e) {
    if (e.button !== undefined && e.button > 0) return
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const onPin = pinScreen
      && Math.hypot(e.clientX - rect.left - pinScreen.x, e.clientY - rect.top - pinScreen.y) <= PIN_GRAB_PX
    dragRef.current = {
      pointerId: e.pointerId,
      mode: onPin ? 'pin' : 'pan',
      startX: e.clientX,
      startY: e.clientY,
      moved: 0,
      originX,
      originY,
    }
    if (e.currentTarget.setPointerCapture) {
      e.currentTarget.setPointerCapture(e.pointerId)
    }
  }

  function handlePointerMove(e) {
    const drag = dragRef.current
    if (!drag) return
    const dx = e.clientX - drag.startX
    const dy = e.clientY - drag.startY
    drag.moved = Math.max(drag.moved, Math.hypot(dx, dy))

    if (drag.mode === 'pin') {
      if (drag.moved >= CLICK_SLOP_PX) placePinAt(e.clientX, e.clientY)
      return
    }
    if (drag.moved < CLICK_SLOP_PX) return
    const next = unproject(drag.originX - dx, drag.originY - dy, zoom)
    setCenter({ lat: clampLat(next.lat), lng: next.lng })
  }

  function handlePointerUp(e) {
    const drag = dragRef.current
    dragRef.current = null
    if (!drag) return
    if (e.currentTarget.releasePointerCapture && drag.pointerId !== undefined) {
      try {
        e.currentTarget.releasePointerCapture(drag.pointerId)
      } catch {
        // The pointer may already have been released — nothing to do.
      }
    }
    if (drag.mode === 'pan' && drag.moved < CLICK_SLOP_PX) {
      placePinAt(e.clientX, e.clientY)
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setHint('Geolocation is not available in this browser — click the map instead.')
      return
    }
    setHint('Locating…')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = {
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
        }
        setCenter(next)
        setZoom((z) => Math.max(z, 15))
        setHint('')
        onChange(next)
      },
      () => setHint('Could not read your location — click the map instead.'),
      { enableHighAccuracy: false, timeout: 8000 }
    )
  }

  return (
    <div className="venue-map-editor">
      <div
        ref={containerRef}
        className="venue-map-editor-canvas"
        role="application"
        aria-label="Venue map — click to place the pitch pin"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {tiles.map((tile) => (
          <img
            key={tile.key}
            className="venue-map-editor-tile"
            src={tile.url}
            alt=""
            draggable={false}
            style={{ left: `${tile.left}px`, top: `${tile.top}px` }}
          />
        ))}
        {pinScreen && (
          <span
            className="venue-map-editor-pin"
            style={{ left: `${pinScreen.x}px`, top: `${pinScreen.y}px` }}
            title={label || 'Pinned pitch'}
          />
        )}
        {!size.w && <span className="venue-map-editor-placeholder">Loading map…</span>}
        <a
          className="venue-map-editor-attribution"
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noreferrer"
        >
          © OpenStreetMap contributors
        </a>
      </div>

      <div className="venue-map-editor-controls">
        <button
          type="button"
          className="venue-map-editor-btn"
          aria-label="Zoom in"
          onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z + 1))}
        >
          +
        </button>
        <button
          type="button"
          className="venue-map-editor-btn"
          aria-label="Zoom out"
          onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z - 1))}
        >
          −
        </button>
        <button type="button" className="venue-map-editor-btn venue-map-editor-btn-wide" onClick={useMyLocation}>
          Use my location
        </button>
        {hasPin && (
          <button
            type="button"
            className="venue-map-editor-btn venue-map-editor-btn-wide"
            onClick={() => onChange({ lat: null, lng: null })}
          >
            Clear pin
          </button>
        )}
      </div>

      <p className="venue-map-editor-hint">
        {hasPin
          ? `Pinned at ${pinLat.toFixed(4)}, ${pinLng.toFixed(4)} — drag the pin or click the map to move it.`
          : 'Click the map to pin the pitch. Drag to pan, + / − to zoom.'}
        {hint ? ` ${hint}` : ''}
      </p>
    </div>
  )
}
