import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { useParams, Link, Navigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { apiRequest } from '../lib/api'
import './LiveMatch.css'

const QUICK_ACTIONS = [
  { value: 'goal', label: 'Goal', scoring: true, tone: 'goal' },
  { value: 'penalty', label: 'Penalty', scoring: false, tone: 'orange' },
  { value: 'shot_on_target', label: 'Shot on Target', scoring: false, tone: 'shot' },
  { value: 'save', label: 'Save', scoring: false, tone: 'neutral' },
  { value: 'yellow_card', label: 'Yellow Card', scoring: false, tone: 'yellow' },
  { value: 'red_card', label: 'Red Card', scoring: false, tone: 'red' },
  { value: 'substitution', label: 'Substitution', scoring: false, tone: 'neutral' },
]

// Full set for the edit form — includes everything a coach might need to correct
// an entry to, even actions not on the quick-tap grid (e.g. 'other').
const EDIT_ACTION_TYPES = [
  { value: 'goal', label: 'Goal' },
  { value: 'point', label: 'Point' },
  { value: 'penalty', label: 'Penalty' },
  { value: 'shot_on_target', label: 'Shot on Target' },
  { value: 'save', label: 'Save' },
  { value: 'yellow_card', label: 'Yellow Card' },
  { value: 'red_card', label: 'Red Card' },
  { value: 'substitution', label: 'Substitution' },
  { value: 'other', label: 'Other' },
]

function formatActionType(type) {
  return type.replace(/_/g, ' ')
}

// Approximation: elapsed minutes since the event's scheduled kickoff time.
// There's no separate "match actually started" timestamp in the schema yet,
// so this drifts if kickoff is delayed.
function elapsedMinutes(eventDate) {
  const diffMs = Date.now() - new Date(eventDate).getTime()
  return Math.max(0, Math.floor(diffMs / 60000))
}

function LiveMatch() {
  const { id } = useParams()
  const { getToken } = useAuth()

  const [detail, setDetail] = useState(null)
  const [squadName, setSquadName] = useState('Your Squad')
  const [athletes, setAthletes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [clockMinute, setClockMinute] = useState(0)

  const [pendingAction, setPendingAction] = useState(null) // { value, label, scoring }
  const [logging, setLogging] = useState(false)

  const [editingEntryId, setEditingEntryId] = useState(null)
  const [editForm, setEditForm] = useState(null)
  const [editSaving, setEditSaving] = useState(false)

  const pollRef = useRef(null)
  const clockRef = useRef(null)

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
    // getToken from Clerk isn't a stable reference across renders — depending on it
    // here would recreate this callback every render and cause an effect/fetch loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    loadDetail()
    apiRequest('/api/athletes', { getToken }).then(setAthletes).catch(() => {})
    apiRequest('/api/squads/mine', { getToken }).then((s) => setSquadName(s.name)).catch(() => {})
    // Only re-run when the event id actually changes, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // Poll while live so the timeline/score stay near-real-time (US16)
  useEffect(() => {
    if (detail?.event?.status === 'live') {
      pollRef.current = setInterval(loadDetail, 5000)
      return () => clearInterval(pollRef.current)
    }
  }, [detail?.event?.status, loadDetail])

  useEffect(() => {
    if (!detail?.event) return
    setClockMinute(elapsedMinutes(detail.event.event_date))
    clockRef.current = setInterval(() => {
      setClockMinute(elapsedMinutes(detail.event.event_date))
    }, 30000)
    return () => clearInterval(clockRef.current)
  }, [detail?.event?.event_date])

  async function handleLog(athleteIdOrOpponent) {
    if (!pendingAction) return
    setLogging(true)
    setError('')
    try {
      await apiRequest(`/api/events/${id}/logs`, {
        method: 'POST',
        body: {
          athlete_id: athleteIdOrOpponent === 'opponent' ? null : Number(athleteIdOrOpponent),
          action_type: pendingAction.value,
          is_scoring: pendingAction.scoring,
          minute: clockMinute,
          notes: null,
        },
        getToken,
      })
      setPendingAction(null)
      await loadDetail()
    } catch (err) {
      setError(err.message)
    } finally {
      setLogging(false)
    }
  }

  async function handleUndo(logId) {
    if (!window.confirm('Undo this log entry?')) return
    try {
      await apiRequest(`/api/events/${id}/logs/${logId}`, { method: 'DELETE', getToken })
      await loadDetail()
    } catch (err) {
      setError(err.message)
    }
  }

  function openEdit(entry) {
    setPendingAction(null)
    setEditingEntryId(entry.id)
    setEditForm({
      for: entry.athlete_id ? String(entry.athlete_id) : 'opponent',
      action_type: entry.action_type,
      is_scoring: entry.is_scoring,
      minute: entry.minute ?? '',
      notes: entry.notes || '',
    })
  }

  function closeEdit() {
    setEditingEntryId(null)
    setEditForm(null)
  }

  async function handleEditSubmit(e) {
    e.preventDefault()
    if (!editForm) return
    setEditSaving(true)
    setError('')
    try {
      await apiRequest(`/api/events/${id}/logs/${editingEntryId}`, {
        method: 'PATCH',
        body: {
          athlete_id: editForm.for !== 'opponent' ? Number(editForm.for) : null,
          action_type: editForm.action_type,
          is_scoring: editForm.is_scoring,
          minute: editForm.minute !== '' ? Number(editForm.minute) : null,
          notes: editForm.notes.trim() || null,
        },
        getToken,
      })
      closeEdit()
      await loadDetail()
    } catch (err) {
      setError(err.message)
    } finally {
      setEditSaving(false)
    }
  }

  if (loading) {
    return (
      <Layout>
        <p className="roster-status">Loading live match...</p>
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

  // If the event isn't live (e.g. someone ended it, or navigated here stale), fall back to the summary
  if (detail.event.status !== 'live') {
    return <Navigate to={`/events/${id}`} replace />
  }

  const { event, result, timeline } = detail

  return (
    <Layout>
      <div className="live-header">
        <div>
          <span className="dashboard-eyebrow">Live match</span>
          <h1>
            {event.event_type === 'match'
              ? `vs ${event.opponent || 'Opponent TBD'}`
              : (event.title || 'Training session')}
          </h1>
        </div>
        <Link to={`/events/${id}`} className="btn btn-ghost">Summary</Link>
      </div>

      {error && <div className="roster-error">{error}</div>}

      {event.event_type === 'match' && (
        <div className="live-scoreboard">
          <span className="live-team">{squadName}</span>
          <div className="live-score-center">
            <span className="live-minute">{clockMinute}'</span>
            <span className="live-score">{result.squad} - {result.opponent}</span>
          </div>
          <span className="live-team live-team-right">{event.opponent || 'Opponent'}</span>
        </div>
      )}

      <h3 className="live-section-heading">Log Event</h3>
      <div className="live-action-grid">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.value}
            type="button"
            className={`live-action-btn live-action-${action.tone}`}
            onClick={() => { closeEdit(); setPendingAction(action) }}
          >
            {action.label}
          </button>
        ))}
      </div>

      {pendingAction && (
        <div className="live-who-panel">
          <div className="live-who-header">
            <span>Who for: {pendingAction.label}?</span>
            <button type="button" className="btn btn-ghost" onClick={() => setPendingAction(null)}>
              Cancel
            </button>
          </div>
          <div className="live-who-grid">
            {athletes.map((a) => (
              <button
                key={a.id}
                type="button"
                className="live-who-btn"
                disabled={logging}
                onClick={() => handleLog(a.id)}
              >
                {a.squad_number != null ? `#${a.squad_number} ` : ''}{a.name}
              </button>
            ))}
            <button
              type="button"
              className="live-who-btn live-who-opponent"
              disabled={logging}
              onClick={() => handleLog('opponent')}
            >
              Opponent
            </button>
          </div>
        </div>
      )}

      <h3 className="live-section-heading">Timeline</h3>
      {timeline.length === 0 ? (
        <div className="roster-empty">
          <p>No actions logged yet.</p>
        </div>
      ) : (
        <div className="live-timeline">
          {timeline.map((entry) => (
            <div key={entry.id}>
              <div className="live-timeline-entry">
                <span className="live-timeline-minute">{entry.minute != null ? `${entry.minute}'` : '—'}</span>
                <div className="live-timeline-body">
                  <span className="live-timeline-action">{formatActionType(entry.action_type)}</span>
                  <span className="live-timeline-who">{entry.athlete_name || 'Opponent'}</span>
                </div>
                <div className="live-timeline-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => openEdit(entry)}>
                    Edit
                  </button>
                  <button type="button" className="btn btn-danger" onClick={() => handleUndo(entry.id)}>
                    Undo
                  </button>
                </div>
              </div>

              {editingEntryId === entry.id && editForm && (
                <form className="roster-form live-edit-form" onSubmit={handleEditSubmit}>
                  <div className="roster-form-grid">
                    <label>
                      For
                      <select
                        value={editForm.for}
                        onChange={(e) => setEditForm({ ...editForm, for: e.target.value })}
                      >
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
                      <select
                        value={editForm.action_type}
                        onChange={(e) => setEditForm({ ...editForm, action_type: e.target.value })}
                      >
                        {EDIT_ACTION_TYPES.map((a) => (
                          <option key={a.value} value={a.value}>{a.label}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Minute
                      <input
                        type="number"
                        min="0"
                        value={editForm.minute}
                        onChange={(e) => setEditForm({ ...editForm, minute: e.target.value })}
                      />
                    </label>
                    <label className="roster-form-checkbox">
                      <input
                        type="checkbox"
                        checked={editForm.is_scoring}
                        onChange={(e) => setEditForm({ ...editForm, is_scoring: e.target.checked })}
                      />
                      Counts toward result
                    </label>
                    <label className="roster-form-wide">
                      Notes
                      <input
                        type="text"
                        value={editForm.notes}
                        onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                        placeholder="Optional"
                      />
                    </label>
                  </div>
                  <div className="roster-form-actions">
                    <button type="button" className="btn btn-ghost" onClick={closeEdit}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-gold" disabled={editSaving}>
                      {editSaving ? 'Saving...' : 'Save changes'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          ))}
        </div>
      )}
    </Layout>
  )
}

export default LiveMatch
