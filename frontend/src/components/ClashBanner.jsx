import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest } from '../lib/api'
import './ClashBanner.css'

// Advisory only — flags other events on the same squad's calendar whose
// scheduled windows overlap this one. Never blocks anything; a coach may
// genuinely need two things happening at once (e.g. an assistant covering
// one while they run the other).
export default function ClashBanner({ eventId, getToken }) {
  const [clashes, setClashes] = useState([])

  useEffect(() => {
    let cancelled = false
    apiRequest(`/api/events/${eventId}/clashes`, { getToken })
      .then((data) => {
        if (!cancelled) setClashes(data || [])
      })
      .catch(() => {
        // A failed clash check shouldn't block viewing the event.
      })
    return () => {
      cancelled = true
    }
  }, [eventId, getToken])

  if (clashes.length === 0) return null

  return (
    <div className="clash-banner" role="alert">
      <span className="clash-banner-icon">⚠️</span>
      <div>
        <strong>Schedule clash{clashes.length > 1 ? 'es' : ''}:</strong>{' '}
        {clashes.map((c, i) => (
          <span key={c.id}>
            <Link to={`/events/${c.id}`}>
              {c.opponent ? `vs ${c.opponent}` : (c.title || 'Untitled event')}
              {' '}({new Date(c.event_date).toLocaleString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' })})
            </Link>
            {i < clashes.length - 1 ? ', ' : ''}
          </span>
        ))}
        {' '}overlaps this one.
      </div>
    </div>
  )
}
