import { useUser, useAuth } from '@clerk/clerk-react'
import { Link } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import Layout from '../components/Layout'
import { apiRequest } from '../lib/api'
import './Dashboard.css'

const API_URL = import.meta.env.VITE_API_URL

function Dashboard() {
  const { user } = useUser()
  const { getToken } = useAuth()
  const firstName = user?.firstName || user?.primaryEmailAddress?.emailAddress || 'Coach'

  const [email, setEmail] = useState('')
  const [inviteLink, setInviteLink] = useState(null)
  const [error, setError] = useState(null)
  const [sending, setSending] = useState(false)

  const [liveEvent, setLiveEvent] = useState(null)
  const [liveResult, setLiveResult] = useState(null)
  const [liveFeed, setLiveFeed] = useState([])

  const loadLiveMatch = useCallback(async () => {
    try {
      const events = await apiRequest('/api/events', { getToken })
      const live = events.find((e) => e.status === 'live') || null
      setLiveEvent(live)

      if (live) {
        const detail = await apiRequest(`/api/events/${live.id}`, { getToken })
        setLiveResult(detail.result)
        const recent = [...detail.timeline]
          .sort((a, b) => new Date(b.logged_at) - new Date(a.logged_at))
          .slice(0, 4)
        setLiveFeed(recent)
      } else {
        setLiveResult(null)
        setLiveFeed([])
      }
    } catch {
      setLiveEvent(null)
      setLiveResult(null)
      setLiveFeed([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    loadLiveMatch()
    const interval = setInterval(loadLiveMatch, 5000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleInvite = async (e) => {
    e.preventDefault()
    setSending(true)
    setError(null)
    setInviteLink(null)

    try {
      const token = await getToken()
      const res = await fetch(API_URL + '/api/invites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
        },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create invite')
      setInviteLink(data.inviteLink)
      setEmail('')
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <Layout>
      <div className="dashboard-header">
        <span className="dashboard-eyebrow">Overview</span>
        <h1>Welcome back, {firstName}</h1>
      </div>

      {liveEvent && liveResult && (
        <Link to={`/live/${liveEvent.id}`} className="dashboard-live-banner">
          <span className="dashboard-live-badge">Live now</span>
          <h2>
            {liveEvent.event_type === 'match'
              ? `vs ${liveEvent.opponent || 'Opponent'}`
              : (liveEvent.title || 'Training session')}
          </h2>
          {liveEvent.event_type === 'match' && (
            <div className="dashboard-live-score">
              {liveResult.squad} - {liveResult.opponent}
            </div>
          )}
          {liveFeed.length > 0 && (
            <ul className="dashboard-live-feed">
              {liveFeed.map((entry) => (
                <li key={entry.id}>
                  <span className="dashboard-live-feed-minute">
                    {entry.minute != null ? `${entry.minute}'` : ''}
                  </span>
                  {entry.action_type.replace(/_/g, ' ')} — {entry.athlete_name || 'Opponent'}
                </li>
              ))}
            </ul>
          )}
          <span className="dashboard-live-cta">Tap to open the live match view &rarr;</span>
        </Link>
      )}

      <div className="dashboard-grid">
        <Link to="/roster" className="dashboard-card">
          <h3>Roster</h3>
          <p>Manage your squad and keep athlete details up to date.</p>
        </Link>
        <Link to="/events" className="dashboard-card">
          <h3>Events</h3>
          <p>Schedule matches and training sessions.</p>
        </Link>
        <Link to="/settings" className="dashboard-card">
          <h3>Account</h3>
          <p>Update your profile, password, or delete your account.</p>
        </Link>
      </div>

      <div className="dashboard-card" style={{ marginTop: '1.5rem' }}>
        <h3>Invite an Assistant</h3>
        <form onSubmit={handleInvite} style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
          <input
            type="email"
            placeholder="assistant@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ flex: 1, padding: '0.5rem' }}
          />
          <button type="submit" disabled={sending}>
            {sending ? 'Sending...' : 'Invite'}
          </button>
        </form>
        {error && <p style={{ color: 'red', marginTop: '0.5rem' }}>{error}</p>}
        {inviteLink && (
          <div style={{ marginTop: '0.75rem' }}>
            <p>Invite created! Share this link:</p>
            <code>{inviteLink}</code>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default Dashboard
