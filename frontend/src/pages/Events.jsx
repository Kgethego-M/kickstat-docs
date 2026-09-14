import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import Loader from '../components/Loader'
import { apiRequest } from '../lib/api'
import WeatherWidget from '../components/WeatherWidget'
import './Events.css'

const emptyForm = {
  title: '',
  opponent: '',
  event_type: 'match',
  format: 'match',
  required_teams: '4',
  event_date: '',
  duration_minutes: '90',
  location: '',
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

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function dayKey(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function Events() {
  const { getToken } = useAuth()
  const navigate = useNavigate()

  // --- My Events state ---
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [squad, setSquad] = useState(null)

  // --- List / Calendar toggle state ---
  const [viewMode, setViewMode] = useState('list') // 'list' | 'calendar'
  const [calendarDate, setCalendarDate] = useState(() => new Date())
  const [dayPopup, setDayPopup] = useState(null) // { key, label, events } | null

  const rosterBelowMinimum = !!(
    squad && squad.athlete_count < squad.min_roster_size
  )

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

  const loadSquad = useCallback(async () => {
    try {
      const data = await apiRequest('/api/squads/mine', { getToken })
      setSquad(data)
    } catch {
      // Non-fatal — the create/join endpoints still enforce the roster
      // minimum server-side even if this pre-check fails to load.
    }
  }, [getToken])

  useEffect(() => {
    loadEvents()
    loadSquad()
  }, [loadEvents, loadSquad])

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

    if (form.format !== 'training' && rosterBelowMinimum) {
      setError(
        `Your roster needs at least ${squad.min_roster_size} athletes to schedule a ${form.format} (you currently have ${squad.athlete_count}).`
      )
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
      location: form.location.trim() || null,
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
    if (rosterBelowMinimum) {
      setError(
        `Your roster needs at least ${squad.min_roster_size} athletes to join this event (you currently have ${squad.athlete_count}).`
      )
      return
    }
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

  // --- Calendar helpers ---

  const eventsByDay = useMemo(() => {
    const map = {}
    for (const event of events) {
      if (!event.event_date) continue
      const key = dayKey(new Date(event.event_date))
      if (!map[key]) map[key] = []
      map[key].push(event)
    }
    for (const key in map) {
      map[key].sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
    }
    return map
  }, [events])

  const calendarCells = useMemo(() => {
    const year = calendarDate.getFullYear()
    const month = calendarDate.getMonth()
    const monthStart = new Date(year, month, 1)
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const leading = monthStart.getDay() // 0 = Sunday
    const totalCells = Math.ceil((leading + daysInMonth) / 7) * 7
    const todayKey = dayKey(new Date())

    const cells = []
    for (let i = 0; i < totalCells; i++) {
      const cellDate = new Date(year, month, i - leading + 1)
      const key = dayKey(cellDate)
      cells.push({
        key,
        date: cellDate,
        inMonth: cellDate.getMonth() === month,
        isToday: key === todayKey,
        events: eventsByDay[key] || [],
      })
    }
    return cells
  }, [calendarDate, eventsByDay])

  function goToMonth(offset) {
    setCalendarDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1))
  }

  function openDayPopup(cell) {
    if (cell.events.length === 0) return
    setDayPopup({
      key: cell.key,
      label: cell.date.toLocaleDateString(undefined, {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
      }),
      events: cell.events,
    })
  }

  function closeDayPopup() {
    setDayPopup(null)
  }

  function handlePopupEventClick(event) {
    closeDayPopup()
    navigateToEvent(event)
  }

  function eventLabel(event) {
    if (event.format === 'league' || event.format === 'tournament') {
      return event.title || 'League'
    }
    return event.title || event.opponent || 'Training'
  }

  function eventTime(event) {
    return new Date(event.event_date).toLocaleTimeString(undefined, {
      hour: 'numeric', minute: '2-digit',
    })
  }

  const monthLabel = calendarDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  return (
    <Layout>
      <div className="roster-header">
        <div>
          <span className="dashboard-eyebrow">Matchday</span>
          <h1>Events</h1>
        </div>
        <div className="roster-header-actions">
          <div className="view-toggle" role="tablist" aria-label="Events view">
            <button
              type="button"
              className={`view-toggle-btn${viewMode === 'list' ? ' view-toggle-btn-active' : ''}`}
              onClick={() => setViewMode('list')}
              aria-pressed={viewMode === 'list'}
            >
              List
            </button>
            <button
              type="button"
              className={`view-toggle-btn${viewMode === 'calendar' ? ' view-toggle-btn-active' : ''}`}
              onClick={() => setViewMode('calendar')}
              aria-pressed={viewMode === 'calendar'}
            >
              Calendar
            </button>
          </div>
          <button className="btn btn-gold" onClick={openForm}>
            Schedule event
          </button>
        </div>
      </div>

      {rosterBelowMinimum && (
        <div className="roster-error">
          Your roster has {squad.athlete_count} athlete{squad.athlete_count === 1 ? '' : 's'}, but you need at
          least {squad.min_roster_size} to schedule or join a match, league, or tournament. Training sessions
          don't require the full minimum.
        </div>
      )}

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
            <label>
              Location
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="e.g. Wits Main Oval, Johannesburg"
              />
            </label>
          </div>

          <WeatherWidget location={form.location} compact />
          <div className="roster-form-actions">
            <button type="button" className="btn btn-ghost" onClick={closeForm}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-gold"
              disabled={saving || (form.format !== 'training' && rosterBelowMinimum)}
              title={
                form.format !== 'training' && rosterBelowMinimum
                  ? `Needs at least ${squad?.min_roster_size} athletes on the roster`
                  : undefined
              }
            >
              {saving ? 'Saving...' : 'Create event'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <Loader label="Loading events..." />
      ) : events.length === 0 ? (
        <div className="roster-empty">
          <p>No events yet. Schedule your first match or training session.</p>
        </div>
      ) : viewMode === 'list' ? (
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
                  disabled={rosterBelowMinimum}
                  title={rosterBelowMinimum ? `Needs at least ${squad?.min_roster_size} athletes on the roster` : undefined}
                >
                  Join
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="calendar-wrap">
          <div className="calendar-header">
            <button type="button" className="calendar-nav-btn" onClick={() => goToMonth(-1)} aria-label="Previous month">
              &larr;
            </button>
            <h2 className="calendar-month-label">{monthLabel}</h2>
            <button type="button" className="calendar-nav-btn" onClick={() => goToMonth(1)} aria-label="Next month">
              &rarr;
            </button>
          </div>

          <div className="calendar-grid">
            {WEEKDAYS.map((wd) => (
              <div key={wd} className="calendar-weekday">{wd}</div>
            ))}
            {calendarCells.map((cell) => (
              <button
                type="button"
                key={cell.key}
                className={[
                  'calendar-day',
                  !cell.inMonth ? 'calendar-day-outside' : '',
                  cell.isToday ? 'calendar-day-today' : '',
                  cell.events.length > 0 ? 'calendar-day-has-events' : '',
                ].filter(Boolean).join(' ')}
                onClick={() => openDayPopup(cell)}
                disabled={cell.events.length === 0}
              >
                <span className="calendar-day-number">{cell.date.getDate()}</span>
                {cell.events.length > 0 && (
                  <span className="calendar-day-chips">
                    {cell.events.slice(0, 2).map((ev) => (
                      <span key={ev.id} className={`calendar-chip calendar-chip-${ev.status}`}>
                        <span className="calendar-chip-time">{eventTime(ev)}</span>
                        <span className="calendar-chip-title">{eventLabel(ev)}</span>
                      </span>
                    ))}
                    {cell.events.length > 2 && (
                      <span className="calendar-day-more">+{cell.events.length - 2} more</span>
                    )}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Day popup */}
      {dayPopup && (
        <div className="calendar-popup-backdrop" onClick={closeDayPopup}>
          <div className="calendar-popup" onClick={(e) => e.stopPropagation()}>
            <div className="calendar-popup-header">
              <h3>{dayPopup.label}</h3>
              <button type="button" className="calendar-popup-close" onClick={closeDayPopup} aria-label="Close">
                &times;
              </button>
            </div>
            <div className="calendar-popup-list">
              {dayPopup.events.map((event) => (
                <button
                  type="button"
                  key={event.id}
                  className="calendar-popup-item"
                  onClick={() => handlePopupEventClick(event)}
                >
                  <span className={`event-status event-status-${event.status}`}>
                    {statusLabel[event.status] || event.status}
                  </span>
                  <span className="calendar-popup-item-title">{eventLabel(event)}</span>
                  <span className="calendar-popup-item-time">{eventTime(event)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}

export default Events