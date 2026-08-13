import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { useParams, Link, Navigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { apiRequest } from '../lib/api'
import './LiveMatch.css'

const QUICK_ACTIONS = [
  { value: 'goal', label: 'Goal', scoring: true, tone: 'goal' },
  { value: 'shot_on_target', label: 'Shot on Target', scoring: false, tone: 'shot' },
  { value: 'save', label: 'Save', scoring: false, tone: 'neutral' },
  { value: 'yellow_card', label: 'Yellow Card', scoring: false, tone: 'yellow' },
  { value: 'red_card', label: 'Red Card', scoring: false, tone: 'red' },
  { value: 'substitution', label: 'Substitution', scoring: false, tone: 'neutral' },
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
  }, [id, getToken])

  useEffect(() => {
    loadDetail()
    apiRequest('/api/athletes', { getToken }).then(setAthletes).catch(() => {})
    apiRequest('/api/squads/mine', { getToken }).then((s) => setSquadName(s.name)).catch(() => {})
  }, [loadDetail, getToken])

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
          <h1>vs {event.opponent || 'Opponent'}</h1>
        </div>
        <Link to={`/events/${id}`} className="btn btn-ghost">Summary</Link>
      </div>

      {error && <div className="roster-error">{error}</div>}

      <div className="live-scoreboard">
        <span className="live-team">{squadName}</span>
        <div className="live-score-center">
          <span className="live-minute">{clockMinute}'</span>
          <span className="live-score">{result.squad} - {result.opponent}</span>
        </div>
        <span className="live-team live-team-right">{event.opponent || 'Opponent'}</span>
      </div>

      <h3 className="live-section-heading">Log Event</h3>
      <div className="live-action-grid">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.value}
            type="button"
            className={`live-action-btn live-action-${action.tone}`}
            onClick={() => setPendingAction(action)}
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
            <div className="live-timeline-entry" key={entry.id}>
              <span className="live-timeline-minute">{entry.minute != null ? `${entry.minute}'` : '—'}</span>
              <div className="live-timeline-body">
                <span className="live-timeline-action">{formatActionType(entry.action_type)}</span>
                <span className="live-timeline-who">{entry.athlete_name || 'Opponent'}</span>
              </div>
              <button type="button" className="btn btn-ghost" onClick={() => handleUndo(entry.id)}>
                Undo
              </button>
            </div>
          ))}
        </div>
      )}
    </Layout>
  )
}

export default LiveMatch
