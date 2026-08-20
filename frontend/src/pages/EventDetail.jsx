import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { apiRequest } from '../lib/api'
import { ACTION_TYPES, formatActionType } from '../lib/actions'
import './EventDetail.css'

const emptyLogForm = {
  for: '', // athlete id as a string, or 'opponent'
  action_type: 'goal',
  is_scoring: true,
  minute: '',
  notes: '',
}

const statusLabel = {
  scheduled: 'Scheduled',
  live: 'Live',
  completed: 'Completed',
  cancelled: 'Cancelled',
  open: 'Open',
  full: 'Full',
}

function SimpleEventDetail({ detail, athletes, id, getToken, onChange }) {
  const { event, result, timeline } = detail
  const [logForm, setLogForm] = useState(emptyLogForm)
  const [editingLogId, setEditingLogId] = useState(null)
  const [logSaving, setLogSaving] = useState(false)
  const [logError, setLogError] = useState('')
  const [error, setError] = useState('')
  const [statusSaving, setStatusSaving] = useState(false)

  async function handleStatusChange(status) {
    setStatusSaving(true)
    setError('')
    try {
      await apiRequest(`/api/events/${id}`, {
        method: 'PATCH',
        body: { status },
        getToken,
      })
      onChange()
    } catch (err) {
      setError(err.message)
    } finally {
      setStatusSaving(false)
    }
  }

  function resetLogForm() {
    setLogForm(emptyLogForm)
    setEditingLogId(null)
    setLogError('')
  }

  function openEditLogForm(entry) {
    setLogForm({
      for: entry.athlete_id ? String(entry.athlete_id) : 'opponent',
      action_type: entry.action_type,
      is_scoring: entry.is_scoring,
      minute: entry.minute ?? '',
      notes: entry.notes || '',
    })
    setEditingLogId(entry.id)
  }

  function handleActionTypeChange(value) {
    const meta = ACTION_TYPES.find((a) => a.value === value)
    setLogForm((f) => ({ ...f, action_type: value, is_scoring: meta ? meta.scoring : f.is_scoring }))
  }

  async function handleLogSubmit(e) {
    e.preventDefault()
    if (!logForm.for) {
      setLogError('Select who this action is for')
      return
    }

    setLogSaving(true)
    setLogError('')

    const payload = {
      athlete_id: logForm.for !== 'opponent' ? Number(logForm.for) : null,
      action_type: logForm.action_type,
      is_scoring: logForm.is_scoring,
      minute: logForm.minute !== '' ? Number(logForm.minute) : null,
      notes: logForm.notes.trim() || null,
    }

    try {
      if (editingLogId) {
        await apiRequest(`/api/events/${id}/logs/${editingLogId}`, {
          method: 'PATCH',
          body: payload,
          getToken,
        })
      } else {
        await apiRequest(`/api/events/${id}/logs`, {
          method: 'POST',
          body: payload,
          getToken,
        })
      }
      resetLogForm()
      onChange()
    } catch (err) {
      setLogError(err.message)
    } finally {
      setLogSaving(false)
    }
  }

  async function handleUndo(logId) {
    if (!window.confirm('Undo this log entry?')) return
    try {
      await apiRequest(`/api/events/${id}/logs/${logId}`, { method: 'DELETE', getToken })
      onChange()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <>
      <div className="roster-header">
        <div>
          <span className="dashboard-eyebrow">
            {event.event_type === 'match' ? 'Match' : 'Training'} · {event.status}
          </span>
          <h1>{event.opponent || 'Training session'}</h1>
          <p className="event-detail-date">{new Date(event.event_date).toLocaleString()}</p>
        </div>
        <div className="event-detail-actions">
          {event.status === 'scheduled' && (
            <button className="btn btn-gold" disabled={statusSaving} onClick={() => handleStatusChange('live')}>
              Start live
            </button>
          )}
          {event.status === 'live' && (
            <button className="btn btn-danger" disabled={statusSaving} onClick={() => handleStatusChange('completed')}>
              End event
            </button>
          )}
        </div>
      </div>

      {error && <div className="roster-error">{error}</div>}

      {event.event_type === 'match' && (
        <div className="event-result">
          <div className="event-result-side">
            <span className="event-result-label">Your Squad</span>
            <span className="event-result-score">{result.squad}</span>
          </div>
          <span className="event-result-sep">—</span>
          <div className="event-result-side">
            <span className="event-result-score">{result.opponent}</span>
            <span className="event-result-label">{event.opponent || 'Opponent'}</span>
          </div>
        </div>
      )}

      <form className="roster-form" onSubmit={handleLogSubmit}>
        <h3>{editingLogId ? 'Edit log entry' : 'Log an action'}</h3>
        <div className="roster-form-grid">
          <label>
            For
            <select value={logForm.for} onChange={(e) => setLogForm({ ...logForm, for: e.target.value })}>
              <option value="" disabled>Select athlete</option>
              {athletes.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}{a.squad_number != null ? ` (#${a.squad_number})` : ''}
                </option>
              ))}
              <option value="opponent">Opponent</option>
            </select>
          </label>
          <label>
            Action
            <select value={logForm.action_type} onChange={(e) => handleActionTypeChange(e.target.value)}>
              {ACTION_TYPES.map((a) => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </label>
          <label>
            Minute
            <input
              type="number"
              min="0"
              value={logForm.minute}
              onChange={(e) => setLogForm({ ...logForm, minute: e.target.value })}
            />
          </label>
          <label className="roster-form-checkbox">
            <input
              type="checkbox"
              checked={logForm.is_scoring}
              onChange={(e) => setLogForm({ ...logForm, is_scoring: e.target.checked })}
            />
            Counts toward result
          </label>
          <label className="roster-form-wide">
            Notes
            <input
              type="text"
              value={logForm.notes}
              onChange={(e) => setLogForm({ ...logForm, notes: e.target.value })}
              placeholder="Optional"
            />
          </label>
        </div>
        <div className="roster-form-actions">
          {editingLogId && (
            <button type="button" className="btn btn-ghost" onClick={resetLogForm}>
              Cancel edit
            </button>
          )}
          <button type="submit" className="btn btn-gold" disabled={logSaving}>
            {logSaving ? 'Saving...' : editingLogId ? 'Save changes' : 'Log action'}
          </button>
        </div>
        {logError && <div className="roster-error">{logError}</div>}
      </form>

      <h3 className="event-timeline-heading">Timeline</h3>
      {timeline.length === 0 ? (
        <div className="roster-empty">
          <p>No actions logged yet.</p>
        </div>
      ) : (
        <div className="event-timeline">
          {timeline.map((entry) => (
            <div className="timeline-entry" key={entry.id}>
              <span className="timeline-minute">{entry.minute != null ? `${entry.minute}'` : '—'}</span>
              <div className="timeline-body">
                <span className="timeline-action">{formatActionType(entry.action_type)}</span>
                <span className="timeline-who">{entry.athlete_name || 'Opponent'}</span>
                {entry.notes && <span className="timeline-notes">{entry.notes}</span>}
              </div>
              <div className="timeline-actions">
                <button className="btn btn-ghost" onClick={() => openEditLogForm(entry)}>Edit</button>
                <button className="btn btn-danger" onClick={() => handleUndo(entry.id)}>Undo</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

function LeagueDetail({ detail, id, getToken, onChange }) {
  const navigate = useNavigate()
  const { event, teams, fixtures, standings, stats } = detail
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')

  async function handleJoin() {
    setJoining(true)
    setError('')
    try {
      await apiRequest(`/api/events/${id}/join`, { method: 'POST', getToken })
      onChange()
    } catch (err) {
      setError(err.message)
    } finally {
      setJoining(false)
    }
  }

  const isOpen = event.status === 'open'
  const mySquadJoined = teams.some((t) => t.is_mine)

  return (
    <>
      <div className="roster-header">
        <div>
          <span className="dashboard-eyebrow">
            {event.format === 'league' ? 'League' : 'Tournament'} · {statusLabel[event.status] || event.status}
          </span>
          <h1>{event.title || 'Untitled league'}</h1>
          <p className="event-detail-date">
            {teams.length} / {event.required_teams} teams joined
          </p>
        </div>
        {isOpen && !mySquadJoined && (
          <button className="btn btn-gold" disabled={joining} onClick={handleJoin}>
            {joining ? 'Joining...' : 'Join league'}
          </button>
        )}
      </div>

      {error && <div className="roster-error">{error}</div>}

      <section className="league-section">
        <h3>Teams</h3>
        <div className="league-teams">
          {teams.map((team) => (
            <span key={team.squad_id} className={`league-team ${team.is_mine ? 'league-team-mine' : ''}`}>
              {team.squad_name}
            </span>
          ))}
        </div>
      </section>

      {standings.length > 0 && (
        <section className="league-section">
          <h3>Standings</h3>
          <table className="league-table">
            <thead>
              <tr>
                <th>Team</th>
                <th>P</th>
                <th>W</th>
                <th>D</th>
                <th>L</th>
                <th>GF</th>
                <th>GA</th>
                <th>GD</th>
                <th>Pts</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((row) => (
                <tr key={row.squadId}>
                  <td>{row.squadName}</td>
                  <td>{row.played}</td>
                  <td>{row.wins}</td>
                  <td>{row.draws}</td>
                  <td>{row.losses}</td>
                  <td>{row.gf}</td>
                  <td>{row.ga}</td>
                  <td>{row.gd}</td>
                  <td className="league-points">{row.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {fixtures.length > 0 && (
        <section className="league-section">
          <h3>Fixtures</h3>
          <div className="league-fixtures">
            {fixtures.map((fixture) => (
              <div key={fixture.id} className={`league-fixture league-fixture-${fixture.status}`}>
                <div className="league-fixture-teams">
                  <span className={fixture.is_home_mine ? 'league-fixture-mine' : ''}>
                    {fixture.home_squad_name}
                  </span>
                  <span className="league-fixture-vs">vs</span>
                  <span className={fixture.is_away_mine ? 'league-fixture-mine' : ''}>
                    {fixture.away_squad_name}
                  </span>
                </div>
                <span className={`event-status event-status-${fixture.status}`}>
                  {statusLabel[fixture.status] || fixture.status}
                </span>
                {fixture.status === 'scheduled' && fixture.is_home_mine && (
                  <button className="btn btn-gold" onClick={() => navigate(`/live/fixture/${fixture.id}`)}>
                    Start live
                  </button>
                )}
                {fixture.status === 'live' && (
                  <button className="btn btn-gold" onClick={() => navigate(`/live/fixture/${fixture.id}`)}>
                    Go live
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {stats && (
        <section className="league-section">
          <h3>Top Scorers</h3>
          {stats.topScorers.length === 0 ? (
            <p className="roster-status">No goals recorded yet.</p>
          ) : (
            <ol className="league-stats-list">
              {stats.topScorers.map((s) => (
                <li key={s.athleteId}>
                  {s.athleteName} <span className="league-stats-meta">({s.squadName})</span> — {s.goals} goal{s.goals === 1 ? '' : 's'}
                </li>
              ))}
            </ol>
          )}

          <h3 className="league-subheading">Top Assisters</h3>
          {stats.topAssisters.length === 0 ? (
            <p className="roster-status">No assists recorded yet.</p>
          ) : (
            <ol className="league-stats-list">
              {stats.topAssisters.map((s) => (
                <li key={s.athleteId}>
                  {s.athleteName} <span className="league-stats-meta">({s.squadName})</span> — {s.assists} assist{s.assists === 1 ? '' : 's'}
                </li>
              ))}
            </ol>
          )}
        </section>
      )}
    </>
  )
}

function EventDetail() {
  const { id } = useParams()
  const { getToken } = useAuth()

  const [detail, setDetail] = useState(null)
  const [athletes, setAthletes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const pollRef = useRef(null)

  const loadDetail = useCallback(async () => {
    try {
      const data = await apiRequest(`/api/events/${id}`, { getToken })
      setDetail(data)
      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [id, getToken])

  const loadAthletes = useCallback(async () => {
    try {
      const data = await apiRequest('/api/athletes', { getToken })
      setAthletes(data)
    } catch {
      // roster load failing isn't fatal to viewing the event
    }
  }, [getToken])

  useEffect(() => {
    loadDetail()
    loadAthletes()
  }, [loadDetail, loadAthletes])

  // Poll while a simple event is live so the dashboard/timeline stays near-real-time.
  useEffect(() => {
    if (detail?.event?.status === 'live' && detail?.event?.format === 'match') {
      pollRef.current = setInterval(loadDetail, 5000)
      return () => clearInterval(pollRef.current)
    }
  }, [detail?.event?.status, detail?.event?.format, loadDetail])

  if (loading) {
    return (
      <Layout>
        <p className="roster-status">Loading event...</p>
      </Layout>
    )
  }

  if (!detail) {
    return (
      <Layout>
        {error && <div className="roster-error">{error}</div>}
      </Layout>
    )
  }

  const isLeague = detail.event.format === 'league' || detail.event.format === 'tournament'

  return (
    <Layout>
      {isLeague ? (
        <LeagueDetail detail={detail} id={id} getToken={getToken} onChange={loadDetail} />
      ) : (
        <SimpleEventDetail detail={detail} athletes={athletes} id={id} getToken={getToken} onChange={loadDetail} />
      )}
    </Layout>
  )
}

export default EventDetail
