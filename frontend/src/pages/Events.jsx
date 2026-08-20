import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@clerk/clerk-react'
import Layout from '../components/Layout'
import { apiRequest } from '../lib/api'
import { Calendar, dateFnsLocalizer } from 'react-big-calendar'
import format from 'date-fns/format'
import parse from 'date-fns/parse'
import startOfWeek from 'date-fns/startOfWeek'
import getDay from 'date-fns/getDay'
import enUS from 'date-fns/locale/en-US'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import './Events.css'

const locales = { 'en-US': enUS }
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
})

const emptyForm = {
  type: 'training',
  title: '',
  event_date: '',
  event_time: '',
  location: '',
}

function Events() {
  const { getToken } = useAuth()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
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

  function openAddForm() {
    setForm(emptyForm)
    setEditingId(null)
    setFormOpen(true)
  }

  function openEditForm(event) {
    setForm({
      type: event.type,
      title: event.title,
      event_date: event.event_date ? event.event_date.slice(0, 10) : '',
      event_time: event.event_time || '',
      location: event.location || '',
    })
    setEditingId(event.id)
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setForm(emptyForm)
    setEditingId(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim() || !form.event_date || !form.event_time || !form.location.trim()) {
      setError('All fields are required')
      return
    }
    setSaving(true)
    setError('')
    const payload = {
      type: form.type,
      title: form.title.trim(),
      event_date: form.event_date,
      event_time: form.event_time,
      location: form.location.trim(),
    }
    try {
      if (editingId) {
        await apiRequest(`/api/events/${editingId}`, { method: 'PATCH', body: payload, getToken })
      } else {
        await apiRequest('/api/events', { method: 'POST', body: payload, getToken })
      }
      closeForm()
      await loadEvents()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleCancel(id) {
    if (!window.confirm('Cancel this event? This cannot be undone.')) return
    try {
      await apiRequest(`/api/events/${id}/cancel`, { method: 'PATCH', getToken })
      await loadEvents()
    } catch (err) {
      setError(err.message)
    }
  }

  // Convert events into the shape react-big-calendar expects
  const calendarEvents = events
    .filter((e) => e.status !== 'cancelled')
    .map((e) => {
      const start = new Date(`${e.event_date?.slice(0, 10)}T${e.event_time}`)
      const end = new Date(start.getTime() + 60 * 60 * 1000) // default 1hr block
      return {
        id: e.id,
        title: `${e.type === 'competition' ? '🏆' : '🏃'} ${e.title}`,
        start,
        end,
        resource: e,
      }
    })

  return (
    <Layout>
      <div className="events-header">
        <div>
          <span className="dashboard-eyebrow">Squad</span>
          <h1>Events</h1>
        </div>
        <button className="btn btn-gold" onClick={openAddForm}>
          New event
        </button>
      </div>

      {error && <div className="events-error">{error}</div>}

      {formOpen && (
        <form className="events-form" onSubmit={handleSubmit}>
          <h3>{editingId ? 'Edit event' : 'New event'}</h3>
          <div className="events-form-grid">
            <label>
              Type
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="training">Training</option>
                <option value="competition">Competition</option>
              </select>
            </label>
            <label>
              Title
              <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </label>
            <label>
              Date
              <input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} required />
            </label>
            <label>
              Time
              <input type="time" value={form.event_time} onChange={(e) => setForm({ ...form, event_time: e.target.value })} required />
            </label>
            <label className="events-form-wide">
              Location
              <input type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} required />
            </label>
          </div>
          <div className="events-form-actions">
            <button type="button" className="btn btn-ghost" onClick={closeForm}>Cancel</button>
            <button type="submit" className="btn btn-gold" disabled={saving}>{saving ? 'Saving...' : 'Save event'}</button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="events-status">Loading events...</p>
      ) : events.length === 0 ? (
        <div className="events-empty"><p>No events yet. Create your first training or match.</p></div>
      ) : (
        <>
          <div className="events-calendar">
            <Calendar
              localizer={localizer}
              events={calendarEvents}
              startAccessor="start"
              endAccessor="end"
              style={{ height: 500 }}
              onSelectEvent={(calEvent) => openEditForm(calEvent.resource)}
            />
          </div>

          <div className="events-list">
            {events.map((event) => (
              <div className={`event-card ${event.status === 'cancelled' ? 'event-card-cancelled' : ''}`} key={event.id}>
                <div className="event-info">
                  <span className="event-type">{event.type}</span>
                  <h3>{event.title}</h3>
                  <p>{event.event_date?.slice(0, 10)} at {event.event_time} — {event.location}</p>
                  {event.status === 'cancelled' && <span className="event-cancelled-tag">Cancelled</span>}
                </div>
                {event.status !== 'cancelled' && (
                  <div className="event-actions">
                    <button className="btn btn-ghost" onClick={() => openEditForm(event)}>Edit</button>
                    <button className="btn btn-danger" onClick={() => handleCancel(event.id)}>Cancel</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </Layout>
  )
}

export default Events