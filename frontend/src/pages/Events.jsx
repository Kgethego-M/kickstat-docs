import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import Loader from '../components/Loader'
import { apiRequest } from '../lib/api'
import WeatherWidget from '../components/WeatherWidget'
import './Events.css'

const LEAGUES = [
  { code: 'PL',  name: 'Premier League' },
  { code: 'PD',  name: 'La Liga' },
  { code: 'BL1', name: 'Bundesliga' },
  { code: 'SA',  name: 'Serie A' },
  { code: 'FL1', name: 'Ligue 1' },
  { code: 'CL',  name: 'Champions League' },
]

const proStatusLabel = {
  SCHEDULED: 'Upcoming',
  TIMED: 'Upcoming',
  IN_PLAY: 'Live',
  PAUSED: 'HT',
  FINISHED: 'FT',
  POSTPONED: 'Postponed',
  SUSPENDED: 'Suspended',
  CANCELLED: 'Cancelled',
}

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

  // --- Pro Fixtures state ---
  const [activeTab, setActiveTab] = useState('mine')  // 'mine' | 'pro'
  const [league, setLeague] = useState('PL')
  const [proFixtures, setProFixtures] = useState([])
  const [proStandings, setProStandings] = useState([])
  const [proLoading, setProLoading] = useState(false)
  const [proError, setProError] = useState('')

  const loadEvents = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true)
    }
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
    // Re-poll so events the backend auto-transitioned to live (the sweep in
    // app.js) show up without a manual refresh.
    const poll = setInterval(() => loadEvents(true), 30000)
    return () => clearInterval(poll)
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

  const loadProData = useCallback(async (leagueCode) => {
    setProLoading(true)
    setProError('')
    setProFixtures([])
    setProStandings([])
    try {
      const [fixtures, standings] = await Promise.all([
        apiRequest(`/api/external/fixtures?league=${leagueCode}`, { getToken }),
        apiRequest(`/api/external/standings?league=${leagueCode}`, { getToken }),
      ])
      setProFixtures(fixtures)
      setProStandings(standings)
    } catch (err) {
      setProError(err.message)
    } finally {
      setProLoading(false)
    }
  }, [getToken])

  useEffect(() => {
    if (activeTab === 'pro') {
      loadProData(league)
    }
  }, [activeTab, league, loadProData])

  function handleLeagueChange(e) {
    setLeague(e.target.value)
  }

  function formatKickoff(iso) {
    if (!iso) return ''
    return new Date(iso).toLocaleString(undefined, {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

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

  // Row title: "Squad — Opponent" for matches once the squad name is known;
  // falls back to the stored title otherwise (leagues keep their own name).
  function eventDisplayTitle(event) {
    if (event.format === 'league' || event.format === 'tournament') {
      return event.title || 'League'
    }
    if (event.opponent && squad?.name) return `${squad.name} — ${event.opponent}`
    return event.title || event.opponent || 'Training session'
  }

  function eventDateParts(event) {
    if (!event.event_date) return { day: 'TBC', time: '' }
    const d = new Date(event.event_date)
    return {
      day: `${d.getDate()} ${d.toLocaleDateString(undefined, { month: 'short' }).toUpperCase()}`,
      time: d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false }),
    }
  }

  const monthLabel = calendarDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  // Hero strip shows the CURRENT month, independent of the calendar's navigable month.
  const heroMonthLabel = new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  // Earliest selectable kickoff is "now" — mirroring the backend's
  // "cannot schedule an event in the past" validation.
  const nowLocal = useMemo(() => {
    // eslint-disable-next-line react-hooks/purity -- one-time snapshot for the datetime-local `min` attribute, computed once on mount
    const d = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    return d.toISOString().slice(0, 16)
  }, [])

  return (
    <Layout>
      <div className="events-page">
      <header className="evt-head">
        <div className="evt-head-text">
          <span className="evt-eyebrow">Schedule and fixtures</span>
          <h1 className="evt-title-main">Events</h1>
        </div>
        <button type="button" className="evt-schedule-btn" onClick={openForm}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" focusable="false">
            <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Schedule event
        </button>
      </header>

      <section className="evt-hero">
        <span className="evt-hero-label">{heroMonthLabel}</span>
        <h2 className="evt-hero-title">Control the week ahead</h2>
        <p className="evt-hero-sub">
          Training, preparation and league fixtures stay in one operational calendar.
        </p>
      </section>

      {activeTab === 'mine' && rosterBelowMinimum && (
        <div className="roster-error">
          Your roster has {squad.athlete_count} athlete{squad.athlete_count === 1 ? '' : 's'}, but you need at
          least {squad.min_roster_size} to schedule or join a match, league, or tournament. Training sessions
          don't require the full minimum.
        </div>
      )}

      {/* Tab bar + list/calendar toggle */}
      <div className="evt-toolbar">
        <div className="events-tabs" aria-label="Events tabs">
          <button
            type="button"
            aria-pressed={activeTab === 'mine'}
            className={`events-tab${activeTab === 'mine' ? ' events-tab-active' : ''}`}
            onClick={() => setActiveTab('mine')}
          >
            My Events
          </button>
          <button
            type="button"
            aria-pressed={activeTab === 'pro'}
            className={`events-tab${activeTab === 'pro' ? ' events-tab-active' : ''}`}
            onClick={() => setActiveTab('pro')}
          >
            Pro Fixtures
          </button>
        </div>
        {activeTab === 'mine' && (
          <div className="view-toggle" role="tablist" aria-label="Events view">
            <button
              type="button"
              className={`view-toggle-btn${viewMode === 'list' ? ' view-toggle-btn-active' : ''}`}
              onClick={() => setViewMode('list')}
              aria-pressed={viewMode === 'list'}
              aria-label="List view"
              title="List view"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
                <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
            <button
              type="button"
              className={`view-toggle-btn${viewMode === 'calendar' ? ' view-toggle-btn-active' : ''}`}
              onClick={() => setViewMode('calendar')}
              aria-pressed={viewMode === 'calendar'}
              aria-label="Calendar view"
              title="Calendar view"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
                <rect x="1.5" y="2.5" width="13" height="12" rx="2" stroke="currentColor" strokeWidth="1.4" />
                <path d="M1.5 6h13M5 1v3M11 1v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {activeTab === 'mine' && error && <div className="roster-error">{error}</div>}

      {activeTab === 'mine' && formOpen && (
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
                min={nowLocal}
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

      {/* My Events tab */}
      {activeTab === 'mine' && (
        loading ? (
          <Loader label="Loading events..." />
        ) : events.length === 0 ? (
          <div className="roster-empty">
            <p>No events yet. Schedule your first match or training session.</p>
          </div>
        ) : viewMode === 'list' ? (
          <div className="events-rows">
            {events.map((event) => {
              const dateParts = eventDateParts(event)
              const isLeagueEvent = event.format === 'league' || event.format === 'tournament'
              return (
                <div key={event.id} className={`evt-row evt-row-${event.status}`}>
                  <button
                    type="button"
                    className="evt-row-main"
                    onClick={() => navigateToEvent(event)}
                  >
                    <span className="evt-date">
                      <span className="evt-date-day">{dateParts.day}</span>
                      {dateParts.time && <span className="evt-date-time">{dateParts.time}</span>}
                    </span>
                    <span className="evt-info">
                      <span className="evt-tags">
                        <span className="evt-tag">{formatLabel[event.format] || event.format}</span>
                        <span className={`event-status event-status-${event.status}`}>
                          {statusLabel[event.status] || event.status}
                        </span>
                      </span>
                      <h3 className="evt-name">{eventDisplayTitle(event)}</h3>
                      <span className="evt-meta">
                        {isLeagueEvent ? (
                          <span>{`${event.team_count || 0} / ${event.required_teams || '?'} teams joined`}</span>
                        ) : event.location ? (
                          <span className="evt-loc">
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true" focusable="false">
                              <path d="M6 10.5S2.5 7.6 2.5 5a3.5 3.5 0 1 1 7 0c0 2.6-3.5 5.5-3.5 5.5Z" stroke="currentColor" strokeWidth="1.2" />
                              <circle cx="6" cy="5" r="1.2" stroke="currentColor" strokeWidth="1.2" />
                            </svg>
                            {event.location}
                          </span>
                        ) : null}
                      </span>
                    </span>
                  </button>
                  <div className="evt-actions">
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
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => navigateToEvent(event)}
                    >
                      Details
                    </button>
                  </div>
                </div>
              )
            })}
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
        )
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

      {/* Pro Fixtures tab */}
      {activeTab === 'pro' && (
        <div className="pro-fixtures-container">
          <div className="pro-fixtures-header">
            <select
              className="pro-league-select"
              value={league}
              onChange={handleLeagueChange}
            >
              {LEAGUES.map((l) => (
                <option key={l.code} value={l.code}>{l.name}</option>
              ))}
            </select>
          </div>

          {proError && <div className="roster-error">{proError}</div>}

          {proLoading ? (
            <Loader label="Loading fixtures..." />
          ) : (
            <>
              {/* Standings table — hidden for CL which has no simple table */}
              {proStandings.length > 0 && (
                <div className="pro-standings-wrap">
                  <h3 className="pro-section-title">Standings</h3>
                  <div className="pro-standings-scroll">
                    <table className="pro-standings-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Team</th>
                          <th>P</th>
                          <th>W</th>
                          <th>D</th>
                          <th>L</th>
                          <th>GD</th>
                          <th>Pts</th>
                        </tr>
                      </thead>
                      <tbody>
                        {proStandings.map((row) => (
                          <tr key={row.position}>
                            <td>{row.position}</td>
                            <td className="pro-standings-team">
                              {row.crest && (
                                <img
                                  src={row.crest}
                                  alt=""
                                  className="pro-crest"
                                />
                              )}
                              {row.team}
                            </td>
                            <td>{row.played}</td>
                            <td>{row.won}</td>
                            <td>{row.drawn}</td>
                            <td>{row.lost}</td>
                            <td>{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}</td>
                            <td className="pro-standings-pts">{row.points}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Fixtures list */}
              <div className="pro-fixtures-list">
                <h3 className="pro-section-title">Fixtures &amp; Results</h3>
                {proFixtures.length === 0 ? (
                  <p className="roster-status">No fixtures available.</p>
                ) : (
                  proFixtures.map((m) => {
                    const isFinished = m.status === 'FINISHED'
                    const isLive = m.status === 'IN_PLAY' || m.status === 'PAUSED'
                    const statusKey = m.status
                    return (
                      <div key={m.id} className={`pro-fixture-row${isLive ? ' pro-fixture-live' : ''}`}>
                        <span className="pro-fixture-home">{m.homeTeam}</span>
                        <span className="pro-fixture-score">
                          {isFinished || isLive
                            ? `${m.score.home ?? 0} – ${m.score.away ?? 0}`
                            : 'vs'}
                        </span>
                        <span className="pro-fixture-away">{m.awayTeam}</span>
                        <span className={`pro-fixture-status pro-fixture-status-${statusKey}`}>
                          {proStatusLabel[statusKey] || statusKey}
                        </span>
                        {!isFinished && !isLive && (
                          <span className="pro-fixture-time">{formatKickoff(m.kickoff)}</span>
                        )}
                        {m.matchday && (
                          <span className="pro-fixture-matchday">MD {m.matchday}</span>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </>
          )}
        </div>
      )}
      </div>
    </Layout>
  )
}

export default Events