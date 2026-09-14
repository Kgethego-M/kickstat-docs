import { useUser, useAuth } from '@clerk/clerk-react'
import { Link, Navigate } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import Layout from '../components/Layout'
import Loader from '../components/Loader'
import { apiRequest } from '../lib/api'
import './Dashboard.css'

const API_URL = import.meta.env.VITE_API_URL

function Dashboard() {
  const { user } = useUser()
  const { getToken } = useAuth()
  const firstName = user?.firstName || user?.primaryEmailAddress?.emailAddress || 'Coach'

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem('kickstat_setup_step')
    }
  }, [])

  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState(null)
  const [athleteId, setAthleteId] = useState(null)
  const [squad, setSquad] = useState(null)

  const [email, setEmail] = useState('')
  const [inviteLink, setInviteLink] = useState(null)
  const [inviteError, setInviteError] = useState(null)
  const [sending, setSending] = useState(false)

  const [liveEvent, setLiveEvent] = useState(null)
  const [liveResult, setLiveResult] = useState(null)
  const [liveFeed, setLiveFeed] = useState([])

  const loadAccount = useCallback(async () => {
    try {
      const me = await apiRequest('/api/account/me', { getToken })
      setRole(me.role)
      setAthleteId(me.athleteId)
    } catch {
      setRole('coach')
    }
  }, [getToken])

  const loadSquad = useCallback(async () => {
    try {
      const data = await apiRequest('/api/squads/mine', { getToken })
      setSquad(data)
    } catch {
      setSquad(null)
    }
  }, [getToken])

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
      // A missing/failed live-match check shouldn't block the rest of the dashboard
      setLiveEvent(null)
      setLiveResult(null)
      setLiveFeed([])
    }
    // getToken from Clerk isn't a stable reference across renders — depending on it
    // here would recreate this callback every render and cause an effect/fetch loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    async function loadAll() {
      await loadAccount()
      await loadSquad()
      await loadLiveMatch()
      setLoading(false)
    }
    loadAll()
    const interval = setInterval(loadLiveMatch, 8000)
    return () => clearInterval(interval)
    // Intentionally run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleInvite = async (e) => {
    e.preventDefault()
    setSending(true)
    setInviteError(null)
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
      setInviteError(err.message)
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <Layout>
        <Loader label="Loading your dashboard..." />
      </Layout>
    )
  }

  if (role === 'athlete' && athleteId) {
    return <Navigate to={`/roster/${athleteId}`} replace />
  }

  // Coaches who haven't finished onboarding are sent to the guided setup flow.
  if (squad && !squad.onboarded) {
    return <Navigate to="/setup" replace />
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

      {role === 'coach' && (
        <div className="dashboard-card" style={{ marginTop: '1.5rem' }}>
          <h3>Invite an Assistant</h3>
          <form
            onSubmit={handleInvite}
            style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}
          >
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
          {inviteError && <p style={{ color: 'red', marginTop: '0.5rem' }}>{inviteError}</p>}
          {inviteLink && (
            <div style={{ marginTop: '0.75rem' }}>
              <p>Invite email sent! They can also use this link directly:</p>
              <code>{inviteLink}</code>
            </div>
          )}
        </div>
      )}
    </Layout>
  )
}

export default Dashboard