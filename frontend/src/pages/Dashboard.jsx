import { useUser, useAuth } from '@clerk/clerk-react'
import { Link, Navigate } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import Layout from '../components/Layout'
import { apiRequest } from '../lib/api'
import './Dashboard.css'

const API_URL = import.meta.env.VITE_API_URL

const emptyAthleteForm = {
  name: '',
  position: '',
  squad_number: '',
  email: '',
}

function Dashboard() {
  const { user } = useUser()
  const { getToken } = useAuth()
  const firstName = user?.firstName || user?.primaryEmailAddress?.emailAddress || 'Coach'

  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState(null)
  const [athleteId, setAthleteId] = useState(null)
  const [athletes, setAthletes] = useState([])

  const [email, setEmail] = useState('')
  const [inviteLink, setInviteLink] = useState(null)
  const [inviteError, setInviteError] = useState(null)
  const [sending, setSending] = useState(false)

  const [liveEvent, setLiveEvent] = useState(null)
  const [liveResult, setLiveResult] = useState(null)
  const [liveFeed, setLiveFeed] = useState([])

  // First-login setup state
  const [teamName, setTeamName] = useState('')
  const [setupAthleteForm, setSetupAthleteForm] = useState(emptyAthleteForm)
  const [setupSaving, setSetupSaving] = useState(false)
  const [setupError, setSetupError] = useState('')
  const [setupInviteLink, setSetupInviteLink] = useState(null)

  const loadAccount = useCallback(async () => {
    try {
      const me = await apiRequest('/api/account/me', { getToken })
      setRole(me.role)
      setAthleteId(me.athleteId)
    } catch {
      setRole('coach')
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadAthletes = useCallback(async () => {
    try {
      const data = await apiRequest('/api/athletes', { getToken })
      setAthletes(data)
    } catch {
      setAthletes([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadSquad = useCallback(async () => {
    try {
      const data = await apiRequest('/api/squads/mine', { getToken })
      setTeamName(data.name || '')
    } catch {
      setTeamName('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    loadAccount()
    loadAthletes()
    loadSquad()
    loadLiveMatch()
    const interval = setInterval(loadLiveMatch, 8000)
    return () => clearInterval(interval)
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

  async function handleFinishSetup(e) {
    e.preventDefault()
    if (!teamName.trim()) {
      setSetupError('Team name is required')
      return
    }
    if (athletes.length === 0) {
      setSetupError('Add at least one athlete to finish setup')
      return
    }
    setSetupSaving(true)
    setSetupError('')
    try {
      await apiRequest('/api/squads/mine', {
        method: 'PATCH',
        body: { name: teamName.trim() },
        getToken,
      })
      await loadSquad()
    } catch (err) {
      setSetupError(err.message)
    } finally {
      setSetupSaving(false)
    }
  }

  async function handleAddSetupAthlete(e) {
    e.preventDefault()
    if (!setupAthleteForm.name.trim()) {
      setSetupError('Athlete name is required')
      return
    }
    setSetupSaving(true)
    setSetupError('')
    setSetupInviteLink(null)
    try {
      const created = await apiRequest('/api/athletes', {
        method: 'POST',
        body: {
          name: setupAthleteForm.name.trim(),
          position: setupAthleteForm.position.trim() || null,
          squad_number: setupAthleteForm.squad_number
            ? Number(setupAthleteForm.squad_number)
            : null,
          email: setupAthleteForm.email.trim() || null,
        },
        getToken,
      })
      setAthletes((prev) => [...prev, created])
      setSetupAthleteForm(emptyAthleteForm)
      if (created.inviteLink) {
        setSetupInviteLink(created.inviteLink)
      }
    } catch (err) {
      setSetupError(err.message)
    } finally {
      setSetupSaving(false)
    }
  }

  if (loading) {
    return (
      <Layout>
        <p className="roster-status">Loading...</p>
      </Layout>
    )
  }

  if (role === 'athlete' && athleteId) {
    return <Navigate to={`/roster/${athleteId}`} replace />
  }

  // First-login guided squad setup for coaches with no athletes yet.
  if (role === 'coach' && athletes.length === 0) {
    return (
      <Layout>
        <div className="dashboard-header">
          <span className="dashboard-eyebrow">Setup</span>
          <h1>Let's build your squad</h1>
          <p>Give your squad a name and add your first athletes to get started.</p>
        </div>

        {setupError && <div className="roster-error">{setupError}</div>}

        <form className="roster-form" onSubmit={handleFinishSetup}>
          <h3>Squad name</h3>
          <label className="roster-form-wide">
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="e.g. Riverside Under-12s"
              required
            />
          </label>

          <h3 style={{ marginTop: '1.5rem' }}>Add your first athlete</h3>
          <div className="roster-form-grid">
            <label>
              Name
              <input
                type="text"
                value={setupAthleteForm.name}
                onChange={(e) =>
                  setSetupAthleteForm({ ...setupAthleteForm, name: e.target.value })
                }
                required
              />
            </label>
            <label>
              Position
              <input
                type="text"
                value={setupAthleteForm.position}
                onChange={(e) =>
                  setSetupAthleteForm({ ...setupAthleteForm, position: e.target.value })
                }
                placeholder="e.g. Striker"
              />
            </label>
            <label>
              Squad number
              <input
                type="number"
                min="0"
                value={setupAthleteForm.squad_number}
                onChange={(e) =>
                  setSetupAthleteForm({ ...setupAthleteForm, squad_number: e.target.value })
                }
              />
            </label>
            <label>
              Email (optional invite)
              <input
                type="email"
                value={setupAthleteForm.email}
                onChange={(e) =>
                  setSetupAthleteForm({ ...setupAthleteForm, email: e.target.value })
                }
                placeholder="athlete@example.com"
              />
            </label>
          </div>

          <div className="roster-form-actions">
            <button
              type="button"
              className="btn btn-gold"
              disabled={setupSaving}
              onClick={handleAddSetupAthlete}
            >
              {setupSaving ? 'Saving...' : 'Add athlete'}
            </button>
            <button
              type="submit"
              className="btn btn-ghost"
              disabled={setupSaving || athletes.length === 0}
            >
              Finish setup
            </button>
          </div>

          {setupInviteLink && (
            <div style={{ marginTop: '1rem' }}>
              <p>Invite created! Share this link with the athlete:</p>
              <code>{setupInviteLink}</code>
            </div>
          )}
        </form>
      </Layout>
    )
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
              <p>Invite created! Share this link:</p>
              <code>{inviteLink}</code>
            </div>
          )}
        </div>
      )}
    </Layout>
  )
}

export default Dashboard
