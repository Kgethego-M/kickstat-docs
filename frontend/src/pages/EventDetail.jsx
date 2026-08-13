import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { useParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { apiRequest } from '../lib/api'
import './EventDetail.css'

const ACTION_TYPES = [
  { value: 'goal', label: 'Goal', scoring: true },
  { value: 'point', label: 'Point', scoring: true },
  { value: 'penalty', label: 'Penalty', scoring: false },
  { value: 'yellow_card', label: 'Yellow card', scoring: false },
  { value: 'red_card', label: 'Red card', scoring: false },
  { value: 'substitution', label: 'Substitution', scoring: false },
  { value: 'other', label: 'Other', scoring: false },
]

const emptyLogForm = {
  for: '', // athlete id as a string, or 'opponent'
  action_type: 'goal',
  is_scoring: true,
  minute: '',
  notes: '',
}

function formatActionType(type) {
  return type.replace(/_/g, ' ')
}

function EventDetail() {
  const { id } = useParams()
  const { getToken } = useAuth()

  const [detail, setDetail] = useState(null)
  const [athletes, setAthletes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusSaving, setStatusSaving] = useState(false)

  const [logForm, setLogForm] = useState(emptyLogForm)
  const [editingLogId, setEditingLogId] = useState(null)
  const [logSaving, setLogSaving] = useState(false)
  const [logError, setLogError] = useState('')

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

  // Poll while the event is live — keeps the dashboard/timeline near-real-time (US16)
  useEffect(() => {
    if (detail?.event?.status === 'live') {
      pollRef.current = setInterval(loadDetail, 5000)
      return () => clearInterval(pollRef.current)
    }
  }, [detail?.event?.status, loadDetail])

  async function handleStatusChange(status) {
    setStatusSaving(true)
    setError('')
    try {
      await apiRequest(`/api/events/${id}`, {
        method: 'PATCH',
        body: { status },
        getToken,
      })
      await loadDetail()
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
      await loadDetail()
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
      await loadDetail()
    } catch (err) {
      setError(err.message)
    }
  }

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

  const { event, result, timeline } = detail

  return (
    <Layout>
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
    </Layout>
  )
}

export default EventDetail
