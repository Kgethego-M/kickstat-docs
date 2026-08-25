import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { useParams, Link, Navigate, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { apiRequest } from '../lib/api'
import { ACTION_TYPES, QUICK_ACTIONS, formatActionType } from '../lib/actions'
import './LiveMatch.css'

// Approximation: elapsed minutes since the scheduled kickoff time.
function elapsedMinutes(eventDate) {
  if (!eventDate) return 0
  const diffMs = Date.now() - new Date(eventDate).getTime()
  return Math.max(0, Math.floor(diffMs / 60000))
}

function useMatchDetail() {
  const { id, fixtureId } = useParams()
  const { getToken } = useAuth()

  const isFixture = Boolean(fixtureId)
  const entityId = fixtureId || id
  const apiPrefix = isFixture ? '/api/fixtures' : '/api/events'

  const [detail, setDetail] = useState(null)
  const [athletes, setAthletes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [clockMinute, setClockMinute] = useState(0)

  const pollRef = useRef(null)
  const clockRef = useRef(null)

  const loadDetail = useCallback(async () => {
    try {
      const data = await apiRequest(`${apiPrefix}/${entityId}`, { getToken })
      setDetail(data)
      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [entityId, apiPrefix])

  useEffect(() => {
    loadDetail()
    apiRequest('/api/athletes', { getToken }).then(setAthletes).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityId, apiPrefix])

  const activeStatus = isFixture ? detail?.fixture?.status : detail?.event?.status
  const activeDate = isFixture ? detail?.fixture?.event_date : detail?.event?.event_date

  useEffect(() => {
    if (activeStatus === 'live') {
      pollRef.current = setInterval(loadDetail, 5000)
      return () => clearInterval(pollRef.current)
    }
  }, [activeStatus, loadDetail])

  useEffect(() => {
    if (!activeDate) return
    setClockMinute(elapsedMinutes(activeDate))
    clockRef.current = setInterval(() => {
      setClockMinute(elapsedMinutes(activeDate))
    }, 30000)
    return () => clearInterval(clockRef.current)
  }, [activeDate])

  return {
    isFixture,
    entityId,
    apiPrefix,
    detail,
    athletes,
    loading,
    error,
    setError,
    clockMinute,
    loadDetail,
  }
}

function LiveMatch() {
  const {
    isFixture,
    entityId,
    apiPrefix,
    detail,
    athletes,
    loading,
    error,
    setError,
    clockMinute,
    loadDetail,
  } = useMatchDetail()

  const { getToken } = useAuth()

  const [pendingAction, setPendingAction] = useState(null)
  const [logging, setLogging] = useState(false)

  const [editingEntryId, setEditingEntryId] = useState(null)
  const [editForm, setEditForm] = useState(null)
  const [editSaving, setEditSaving] = useState(false)
  const [endingFixture, setEndingFixture] = useState(false)
  const navigate = useNavigate()

  async function handleLog(athleteIdOrOpponent) {
    if (!pendingAction) return
    setLogging(true)
    setError('')
    try {
      await apiRequest(`${apiPrefix}/${entityId}/logs`, {
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
      await apiRequest(`${apiPrefix}/${entityId}/logs/${logId}`, { method: 'DELETE', getToken })
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
      await apiRequest(`${apiPrefix}/${entityId}/logs/${editingEntryId}`, {
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

  async function handleEndFixture() {
    if (!window.confirm('End this fixture? No more actions can be logged.')) return
    setEndingFixture(true)
    setError('')
    try {
      await apiRequest(`${apiPrefix}/${entityId}`, {
        method: 'PATCH',
        body: { status: 'completed' },
        getToken,
      })
      navigate(summaryPath)
    } catch (err) {
      setError(err.message)
    } finally {
      setEndingFixture(false)
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

  // For simple events, fall back to summary if not live.
  if (!isFixture && detail.event.status !== 'live') {
    return <Navigate to={`/events/${entityId}`} replace />
  }

  const event = isFixture ? detail.fixture : detail.event
  const rawResult = detail.result || { home: 0, away: 0 }
  const result = isFixture
    ? rawResult
    : { home: rawResult.squad ?? 0, away: rawResult.opponent ?? 0 }
  const timeline = detail.timeline || []
  const canLog = isFixture ? detail.canLog : true

  const homeName = isFixture ? event.home_squad_name : 'Your Squad'
  const awayName = isFixture ? event.away_squad_name : (event.opponent || 'Opponent')
  const summaryPath = isFixture ? `/events/${event.event_id}` : `/events/${entityId}`

  return (
    <Layout>
      <div className="live-header">
        <div>
          <span className="dashboard-eyebrow">Live match</span>
          <h1>
            {isFixture
              ? `${homeName} vs ${awayName}`
              : (event.event_type === 'match'
                ? `vs ${event.opponent || 'Opponent TBD'}`
                : (event.title || 'Training session'))}
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {isFixture && event.status === 'live' && canLog && (
            <button
              type="button"
              className="btn btn-danger"
              disabled={endingFixture}
              onClick={handleEndFixture}
            >
              {endingFixture ? 'Ending...' : 'End fixture'}
            </button>
          )}
          <Link to={summaryPath} className="btn btn-ghost">Summary</Link>
        </div>
      </div>

      {error && <div className="roster-error">{error}</div>}

      <div className="live-scoreboard">
        <span className="live-team">{homeName}</span>
        <div className="live-score-center">
          <span className="live-minute">{clockMinute}'</span>
          <span className="live-score">{result.home} - {result.away}</span>
        </div>
        <span className="live-team live-team-right">{awayName}</span>
      </div>

      {canLog && (
        <>
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
        </>
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
                {canLog && (
                  <div className="live-timeline-actions">
                    <button type="button" className="btn btn-ghost" onClick={() => openEdit(entry)}>
                      Edit
                    </button>
                    <button type="button" className="btn btn-danger" onClick={() => handleUndo(entry.id)}>
                      Undo
                    </button>
                  </div>
                )}
              </div>

              {canLog && editingEntryId === entry.id && editForm && (
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
