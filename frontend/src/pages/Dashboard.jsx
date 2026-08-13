import { useUser, useAuth } from '@clerk/clerk-react'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import Layout from '../components/Layout'
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
      <div className="dashboard-grid">
        <Link to="/roster" className="dashboard-card">
          <h3>Roster</h3>
          <p>Manage your squad and keep athlete details up to date.</p>
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
