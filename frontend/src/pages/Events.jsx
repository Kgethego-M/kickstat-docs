import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { apiRequest } from '../lib/api'
import './Events.css'

const emptyForm = {
  opponent: '',
  event_type: 'match',
  event_date: '',
}

const statusLabel = {
  scheduled: 'Scheduled',
  live: 'Live',
  completed: 'Completed',
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

    try {
      const created = await apiRequest('/api/events', {
        method: 'POST',
        body: {
          opponent: form.opponent.trim() || null,
          event_type: form.event_type,
          event_date: form.event_date,
        },
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
              Opponent
              <input
                type="text"
                value={form.opponent}
                onChange={(e) => setForm({ ...form, opponent: e.target.value })}
                placeholder="e.g. Riverside FC"
              />
            </label>
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
            <label>
              Date &amp; time
              <input
                type="datetime-local"
                value={form.event_date}
                onChange={(e) => setForm({ ...form, event_date: e.target.value })}
                required
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
        <div className="events-list">
          {events.map((event) => (
            <button
              key={event.id}
              type="button"
              className="event-row"
              onClick={() => navigate(`/events/${event.id}`)}
            >
              <div className="event-row-main">
                <span className={`event-status event-status-${event.status}`}>
                  {statusLabel[event.status] || event.status}
                </span>
                <h3>{event.opponent || 'Training session'}</h3>
              </div>
              <span className="event-row-date">
                {new Date(event.event_date).toLocaleString()}
              </span>
            </button>
          ))}
        </div>
      )}
    </Layout>
  )
}

export default Events
