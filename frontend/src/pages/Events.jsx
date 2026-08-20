import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { apiRequest } from '../lib/api'
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

  // --- My Events state ---
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  // --- Pro Fixtures state ---
  const [activeTab, setActiveTab] = useState('mine')  // 'mine' | 'pro'
  const [league, setLeague] = useState('PL')
  const [proFixtures, setProFixtures] = useState([])
  const [proStandings, setProStandings] = useState([])
  const [proLoading, setProLoading] = useState(false)
  const [proError, setProError] = useState('')

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

  return (
    <Layout>
      <div className="roster-header">
        <div>
          <span className="dashboard-eyebrow">Matchday</span>
          <h1>Events</h1>
        </div>
        {activeTab === 'mine' && (
          <button className="btn btn-gold" onClick={openForm}>
            Schedule event
          </button>
        )}
      </div>

      {/* Tab bar */}
      <div className="events-tabs">
        <button
          type="button"
          className={`events-tab${activeTab === 'mine' ? ' events-tab-active' : ''}`}
          onClick={() => setActiveTab('mine')}
        >
          My Events
        </button>
        <button
          type="button"
          className={`events-tab${activeTab === 'pro' ? ' events-tab-active' : ''}`}
          onClick={() => setActiveTab('pro')}
        >
          Pro Fixtures
        </button>
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

      {/* My Events tab */}
      {activeTab === 'mine' && (
        loading ? (
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
        )
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
            <p className="roster-status">Loading fixtures...</p>
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
    </Layout>
  )
}

export default Events
