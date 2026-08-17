import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { useParams, Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { apiRequest } from '../lib/api'
import './AthleteStats.css'

function AthleteStats() {
  const { id } = useParams()
  const { getToken } = useAuth()

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (loading) {
    return (
      <Layout>
        <p className="roster-status">Loading athlete stats...</p>
      </Layout>
    )
  }

  if (error || !data) {
    return (
      <Layout>
        {error && <div className="roster-error">{error}</div>}
        <Link to="/roster" className="btn btn-ghost">Back to roster</Link>
      </Layout>
    )
  }

  const { athlete, stats, logs } = data

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

      <div className="stats-grid">
        <div className="stats-card">
          <span className="stats-value">{stats.goals}</span>
          <span className="stats-label">Goals</span>
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
        <div className="stats-card">
          <span className="stats-value">{stats.appearances}</span>
          <span className="stats-label">Appearances</span>
        </div>
      </div>

      <h3 className="live-section-heading">Logged Actions</h3>
      {logs.length === 0 ? (
        <div className="roster-empty">
          <p>No actions logged for this athlete yet.</p>
        </div>
      ) : (
        <div className="live-timeline">
          {logs.map((entry) => (
            <div className="live-timeline-entry" key={entry.id}>
              <span className="live-timeline-minute">
                {entry.minute != null ? `${entry.minute}'` : '—'}
              </span>
              <div className="live-timeline-body">
                <span className="live-timeline-action">{entry.action_type.replace(/_/g, ' ')}</span>
                <span className="live-timeline-who">
                  {entry.opponent ? `vs ${entry.opponent}` : 'Training'} · {new Date(entry.event_date).toLocaleDateString()}
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
