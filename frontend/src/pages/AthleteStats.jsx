import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { useParams, Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { apiRequest } from '../lib/api'
import { formatActionType } from '../lib/actions'
import './AthleteStats.css'

const emptyInjuryForm = {
  description: '',
  date_sustained: '',
  severity: 'moderate',
}

function AthleteStats() {
  const { id } = useParams()
  const { getToken } = useAuth()

  const [data, setData] = useState(null)
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [injuryFormOpen, setInjuryFormOpen] = useState(false)
  const [injuryForm, setInjuryForm] = useState(emptyInjuryForm)
  const [savingInjury, setSavingInjury] = useState(false)
  const [editingReturnDateId, setEditingReturnDateId] = useState(null)
  const [returnDateDraft, setReturnDateDraft] = useState('')

  const isCoach = role === 'coach'

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await apiRequest(`/api/athletes/${id}/stats`, { getToken })
      setData(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const loadAccount = useCallback(async () => {
    try {
      const me = await apiRequest('/api/account/me', { getToken })
      setRole(me.role)
    } catch {
      setRole('coach')
    }
  }, [getToken])

  useEffect(() => {
    load()
    loadAccount()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function handleLogInjury(e) {
    e.preventDefault()
    if (!injuryForm.description.trim() || !injuryForm.date_sustained) {
      setError('Description and date sustained are required')
      return
    }
    setSavingInjury(true)
    setError('')
    try {
      await apiRequest('/api/injuries', {
        method: 'POST',
        body: { athlete_id: Number(id), ...injuryForm },
        getToken,
      })
      setInjuryFormOpen(false)
      setInjuryForm(emptyInjuryForm)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingInjury(false)
    }
  }

  async function handleClearInjury(injuryId) {
    if (!window.confirm('Mark this injury as cleared?')) return
    try {
      await apiRequest(`/api/injuries/${injuryId}`, {
        method: 'PATCH',
        body: { clear: true },
        getToken,
      })
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  function startEditReturnDate(injury) {
    setEditingReturnDateId(injury.id)
    setReturnDateDraft(injury.return_date ? injury.return_date.slice(0, 10) : '')
  }

  async function saveReturnDate(injuryId) {
    try {
      await apiRequest(`/api/injuries/${injuryId}`, {
        method: 'PATCH',
        body: { return_date: returnDateDraft },
        getToken,
      })
      setEditingReturnDateId(null)
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) {
    return (
      <Layout>
        <p className="roster-status">Loading athlete stats...</p>
      </Layout>
    )
  }

  if (error && !data) {
    return (
      <Layout>
        <div className="roster-error">{error}</div>
        <Link to="/roster" className="btn btn-ghost">Back to roster</Link>
      </Layout>
    )
  }

  const { athlete, stats, logs, injuries, currentInjury } = data

  return (
    <Layout>
      <div className="roster-header">
        <div>
          <span className="dashboard-eyebrow">Squad</span>
          <h1>
            {athlete.squad_number != null ? `#${athlete.squad_number} ` : ''}{athlete.name}
          </h1>
          {athlete.position && <span className="athlete-position">{athlete.position}</span>}
        </div>
        <Link to="/roster" className="btn btn-ghost">Back to roster</Link>
      </div>

      {error && <div className="roster-error">{error}</div>}

      {currentInjury && (
        <div className="injury-banner">
          <strong>Currently injured:</strong> {currentInjury.description}
          {' — '}
          estimated return {new Date(currentInjury.return_date).toLocaleDateString()}
        </div>
      )}

      <div className="stats-grid">
        <div className="stats-card">
          <span className="stats-value">{stats.appearances}</span>
          <span className="stats-label">Appearances</span>
        </div>
        <div className="stats-card">
          <span className="stats-value">{stats.goals}</span>
          <span className="stats-label">Goals</span>
        </div>
        <div className="stats-card">
          <span className="stats-value">{stats.assists}</span>
          <span className="stats-label">Assists</span>
        </div>
        <div className="stats-card">
          <span className="stats-value">{stats.penalties}</span>
          <span className="stats-label">Penalties</span>
        </div>
        <div className="stats-card">
          <span className="stats-value">{stats.yellowCards}</span>
          <span className="stats-label">Yellow Cards</span>
        </div>
        <div className="stats-card">
          <span className="stats-value">{stats.redCards}</span>
          <span className="stats-label">Red Cards</span>
        </div>
      </div>

      <div className="injury-section-header">
        <h3 className="live-section-heading">Injury history</h3>
        <button className="btn btn-ghost" onClick={() => setInjuryFormOpen((v) => !v)}>
          {injuryFormOpen ? 'Cancel' : 'Log injury'}
        </button>
      </div>

      {injuryFormOpen && (
        <form className="roster-form" onSubmit={handleLogInjury}>
          <div className="roster-form-grid">
            <label className="roster-form-wide">
              Description
              <input
                type="text"
                value={injuryForm.description}
                onChange={(e) => setInjuryForm({ ...injuryForm, description: e.target.value })}
                placeholder="e.g. Grade 2 hamstring strain"
                required
              />
            </label>
            <label>
              Date sustained
              <input
                type="date"
                value={injuryForm.date_sustained}
                onChange={(e) => setInjuryForm({ ...injuryForm, date_sustained: e.target.value })}
                required
              />
            </label>
            <label>
              Severity
              <select
                value={injuryForm.severity}
                onChange={(e) => setInjuryForm({ ...injuryForm, severity: e.target.value })}
              >
                <option value="minor">Minor</option>
                <option value="moderate">Moderate</option>
                <option value="severe">Severe</option>
              </select>
            </label>
          </div>
          <p className="injury-form-note">
            The return date is estimated automatically from the description where possible,
            and can be adjusted afterwards. This is a planning estimate only — always confirm
            with a medical professional.
          </p>
          <div className="roster-form-actions">
            <button type="submit" className="btn btn-gold" disabled={savingInjury}>
              {savingInjury ? 'Saving...' : 'Save injury'}
            </button>
          </div>
        </form>
      )}

      {injuries.length === 0 ? (
        <div className="roster-empty">
          <p>No injuries logged for this athlete.</p>
        </div>
      ) : (
        <div className="injury-list">
          {injuries.map((injury) => {
            const isActive = !injury.cleared_at && new Date(injury.return_date) >= new Date(new Date().toDateString())
            return (
              <div className="injury-card" key={injury.id}>
                <div className="injury-card-main">
                  <strong>{injury.description}</strong>
                  <span className={`injury-severity injury-severity--${injury.severity}`}>
                    {injury.severity}
                  </span>
                  {injury.cleared_at && <span className="injury-cleared-tag">Cleared</span>}
                  {!injury.cleared_at && !isActive && <span className="injury-cleared-tag">Recovered</span>}
                </div>
                <div className="injury-card-meta">
                  Sustained {new Date(injury.date_sustained).toLocaleDateString()}
                  {' — '}
                  {editingReturnDateId === injury.id ? (
                    <>
                      <input
                        type="date"
                        value={returnDateDraft}
                        onChange={(e) => setReturnDateDraft(e.target.value)}
                      />
                      <button className="btn btn-ghost" onClick={() => saveReturnDate(injury.id)}>Save</button>
                      <button className="btn btn-ghost" onClick={() => setEditingReturnDateId(null)}>Cancel</button>
                    </>
                  ) : (
                    <>
                      estimated return {injury.return_date ? new Date(injury.return_date).toLocaleDateString() : '—'}
                      {isCoach && !injury.cleared_at && (
                        <button className="btn btn-ghost injury-inline-btn" onClick={() => startEditReturnDate(injury)}>
                          Adjust
                        </button>
                      )}
                    </>
                  )}
                </div>
                {injury.estimation_basis && (
                  <p className="injury-basis">{injury.estimation_basis}</p>
                )}
                {isCoach && !injury.cleared_at && editingReturnDateId !== injury.id && (
                  <button className="btn btn-ghost injury-inline-btn" onClick={() => handleClearInjury(injury.id)}>
                    Mark cleared
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      <h3 className="live-section-heading">Logged Actions</h3>
      {logs.length === 0 ? (
        <div className="roster-empty">
          <p>No actions logged for this athlete yet.</p>
        </div>
      ) : (
        <div className="live-timeline">
          {logs.map((entry) => (
            <div className="live-timeline-entry" key={entry.id}>
              <span className={`live-timeline-minute ${
                entry.action_type === 'goal' ? 'live-timeline-minute--goal'
                : entry.action_type.includes('card') ? 'live-timeline-minute--card'
                : entry.action_type.includes('penalty') ? 'live-timeline-minute--penalty'
                : ''
              }`}>
                {entry.minute != null ? `${entry.minute}'` : '—'}
              </span>
              <div className="live-timeline-body">
                <span className="live-timeline-action">{formatActionType(entry.action_type)}</span>
                <span className="live-timeline-who">
                  {entry.opponent ? `vs ${entry.opponent}` : 'Training'}
                  {' · '}
                  {new Date(entry.event_date).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  )
}

export default AthleteStats