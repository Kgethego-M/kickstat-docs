import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { useParams, Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { apiRequest } from '../lib/api'
import { formatActionType } from '../lib/actions'
import './AthleteStats.css'

// Simple, dependency-free bar chart for season trends. Renders raw SVG so we
// don't need to add a charting library just for one trend line.
function SeasonTrendChart({ seasonBreakdown }) {
  if (!seasonBreakdown || seasonBreakdown.length === 0) return null

  const width = 600
  const height = 180
  const padding = 32
  const barGap = 12
  const maxGoals = Math.max(...seasonBreakdown.map((s) => s.goals), 1)
  const barWidth =
    (width - padding * 2 - barGap * (seasonBreakdown.length - 1)) / seasonBreakdown.length

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: '100%', maxWidth: 600, height: 'auto' }}
      role="img"
      aria-label="Goals per season trend chart"
    >
      {seasonBreakdown.map((s, i) => {
        const barHeight = (s.goals / maxGoals) * (height - padding * 2)
        const x = padding + i * (barWidth + barGap)
        const y = height - padding - barHeight

        return (
          <g key={s.season}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx={4}
              fill="#c9a227"
            />
            <text
              x={x + barWidth / 2}
              y={y - 6}
              textAnchor="middle"
              fontSize="12"
              fill="#333"
            >
              {s.goals}
            </text>
            <text
              x={x + barWidth / 2}
              y={height - padding + 16}
              textAnchor="middle"
              fontSize="11"
              fill="#666"
            >
              {s.season}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function AthleteStats() {
  const { id } = useParams()
  const { getToken } = useAuth()

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedSeason, setSelectedSeason] = useState('') // '' = all time

  const load = useCallback(async (season) => {
    setLoading(true)
    setError('')
    try {
      const query = season ? `?season=${encodeURIComponent(season)}` : ''
      const result = await apiRequest(`/api/athletes/${id}/stats${query}`, { getToken })
      setData(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    load(selectedSeason)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, selectedSeason])

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

  const { athlete, stats, logs, seasons, seasonBreakdown, opponentBreakdown } = data

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

      {seasons.length > 0 && (
        <div style={{ margin: '1rem 0' }}>
          <label style={{ fontSize: '0.9rem', color: '#555', marginRight: '0.5rem' }}>
            Season
          </label>
          <select
            value={selectedSeason}
            onChange={(e) => setSelectedSeason(e.target.value)}
            style={{ padding: '0.4rem 0.6rem', borderRadius: 6 }}
          >
            <option value="">All time</option>
            {seasons.map((season) => (
              <option key={season} value={season}>{season}</option>
            ))}
          </select>
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

      {seasonBreakdown.length > 1 && (
        <>
          <h3 className="live-section-heading">Goals by season</h3>
          <SeasonTrendChart seasonBreakdown={seasonBreakdown} />
        </>
      )}

      {opponentBreakdown.length > 0 && (
        <>
          <h3 className="live-section-heading">Opponent comparison</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
                  <th style={{ padding: '0.5rem' }}>Opponent</th>
                  <th style={{ padding: '0.5rem' }}>Apps</th>
                  <th style={{ padding: '0.5rem' }}>Goals</th>
                  <th style={{ padding: '0.5rem' }}>Assists</th>
                  <th style={{ padding: '0.5rem' }}>Yellow</th>
                  <th style={{ padding: '0.5rem' }}>Red</th>
                </tr>
              </thead>
              <tbody>
                {opponentBreakdown.map((o) => (
                  <tr key={o.opponent} style={{ borderBottom: '1px solid #f2f2f2' }}>
                    <td style={{ padding: '0.5rem' }}>{o.opponent}</td>
                    <td style={{ padding: '0.5rem' }}>{o.appearances}</td>
                    <td style={{ padding: '0.5rem' }}>{o.goals}</td>
                    <td style={{ padding: '0.5rem' }}>{o.assists}</td>
                    <td style={{ padding: '0.5rem' }}>{o.yellowCards}</td>
                    <td style={{ padding: '0.5rem' }}>{o.redCards}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <h3 className="live-section-heading">Logged Actions</h3>
      {logs.length === 0 ? (
        <div className="roster-empty">
          <p>No actions logged for this athlete{selectedSeason ? ` in ${selectedSeason}` : ' yet'}.</p>
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