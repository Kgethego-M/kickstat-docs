import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { apiRequest } from '../lib/api'
import './Events.css'

const emptyForm = {
  title: '',
  opponent: '',
  event_type: 'match',
  format: 'match',
  required_teams: '4',
  event_date: '',
  duration_minutes: '90',
}

const statusLabel = {
  scheduled: 'Scheduled',
  live: 'Live',
  completed: 'Completed',
  cancelled: 'Cancelled',
  open: 'Open',
  full: 'Full',
}

const formatLabel = {
  match: 'Match',
  training: 'Training',
  league: 'League',
  tournament: 'Tournament',
}

function Events() {
  const { getToken } = useAuth()
  const navigate = useNavigate()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const loadEvents = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await apiRequest('/api/events', { getToken })
      setEvents(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [getToken])

  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  function openForm() {
    setForm(emptyForm)
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setForm(emptyForm)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.event_date) {
      setError('Event date is required')
      return
    }

    setSaving(true)
    setError('')

    const isLeague = form.format === 'league' || form.format === 'tournament'
    const body = {
      title: isLeague ? form.title.trim() || null : form.opponent.trim() || null,
      opponent: form.opponent.trim() || null,
      event_type: form.event_type,
      format: form.format,
      required_teams: isLeague ? Number(form.required_teams) : null,
      event_date: form.event_date,
      duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : 90,
    }

    try {
      const created = await apiRequest('/api/events', {
        method: 'POST',
        body,
        getToken,
      })
      closeForm()
      navigate(`/events/${created.id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleJoin(eventId) {
    setError('')
    try {
      await apiRequest(`/api/events/${eventId}/join`, { method: 'POST', getToken })
      await loadEvents()
    } catch (err) {
      setError(err.message)
    }
  }

  function navigateToEvent(event) {
    if (event.format === 'league' || event.format === 'tournament') {
      navigate(`/events/${event.id}`)
      return
    }
    navigate(event.status === 'live' ? `/live/${event.id}` : `/events/${event.id}`)
  }

  const isLeagueForm = form.format === 'league' || form.format === 'tournament'

  return (
    <Layout>
      <div className="roster-header">
        <div>
          <span className="dashboard-eyebrow">Matchday</span>
          <h1>Events</h1>
        </div>
        <button className="btn btn-gold" onClick={openForm}>
          Schedule event
        </button>
      </div>

      {error && <div className="roster-error">{error}</div>}

      {formOpen && (
        <form className="roster-form" onSubmit={handleSubmit}>
          <h3>Schedule event</h3>
          <div className="roster-form-grid">
            <label>
              Format
              <select
                value={form.format}
                onChange={(e) => setForm({ ...form, format: e.target.value })}
              >
                <option value="match">Match</option>
                <option value="training">Training</option>
                <option value="league">League</option>
                <option value="tournament">Tournament</option>
              </select>
            </label>
            {isLeagueForm ? (
              <label>
                Event name
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Winter League 2026"
                />
              </label>
            ) : (
              <label>
                Opponent
                <input
                  type="text"
                  value={form.opponent}
                  onChange={(e) => setForm({ ...form, opponent: e.target.value })}
                  placeholder="e.g. Riverside FC"
                />
              </label>
            )}
            {!isLeagueForm && (
              <label>
                Type
                <select
                  value={form.event_type}
                  onChange={(e) => setForm({ ...form, event_type: e.target.value })}
                >
                  <option value="match">Match</option>
                  <option value="training">Training</option>
                </select>
              </label>
            )}
            {isLeagueForm && (
              <label>
                Teams required
                <input
                  type="number"
                  min="2"
                  value={form.required_teams}
                  onChange={(e) => setForm({ ...form, required_teams: e.target.value })}
                />
              </label>
            )}
            <label>
              Date &amp; time
              <input
                type="datetime-local"
                value={form.event_date}
                onChange={(e) => setForm({ ...form, event_date: e.target.value })}
                required
              />
            </label>
            <label>
              Duration (minutes)
              <input
                type="number"
                min="1"
                value={form.duration_minutes}
                onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })}
              />
            </label>
          </div>
          <div className="roster-form-actions">
            <button type="button" className="btn btn-ghost" onClick={closeForm}>
              Cancel
            </button>
            <button type="submit" className="btn btn-gold" disabled={saving}>
              {saving ? 'Saving...' : 'Create event'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="roster-status">Loading events...</p>
      ) : events.length === 0 ? (
        <div className="roster-empty">
          <p>No events yet. Schedule your first match or training session.</p>
        </div>
      ) : (
        <div className="events-grid">
          {events.map((event) => (
            <div key={event.id} className={`event-card event-card-${event.status}`}>
              <button
                type="button"
                className="event-card-main"
                onClick={() => navigateToEvent(event)}
              >
                <span className={`event-status event-status-${event.status}`}>
                  {statusLabel[event.status] || event.status}
                </span>
                <span className="event-card-format">{formatLabel[event.format] || event.format}</span>
                <h3 className="event-card-title">{event.title || event.opponent || 'Training session'}</h3>
                <span className="event-card-date">
                  {event.format === 'league' || event.format === 'tournament'
                    ? `${event.team_count || 0} / ${event.required_teams || '?'} teams joined`
                    : new Date(event.event_date).toLocaleString()}
                </span>
                {event.location && <span className="event-card-location">{event.location}</span>}
              </button>
              {event.status === 'open' && event.team_count < event.required_teams && (
                <button
                  type="button"
                  className="btn btn-gold btn-join"
                  onClick={() => handleJoin(event.id)}
                >
                  Join
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </Layout>
  )
}

export default Events
