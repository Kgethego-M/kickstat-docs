import { UserButton, useUser, useAuth } from '@clerk/clerk-react'
import { Link } from 'react-router-dom'
import { useState } from 'react'

function Dashboard() {
  const { user } = useUser()
  const { getToken } = useAuth()
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

      const res = await fetch('http://localhost:5001/api/invites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create invite')
      }

      setInviteLink(data.inviteLink)
      setEmail('')
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>Dashboard</h1>
      <p>Welcome, {user?.primaryEmailAddress?.emailAddress}</p>
      <UserButton />
      <p>
        <Link to="/settings">Account Settings</Link>
      </p>

      <hr style={{ margin: '2rem auto', maxWidth: '400px' }} />

      <h2>Invite an Assistant</h2>
      <form onSubmit={handleInvite} style={{ maxWidth: '400px', margin: '0 auto' }}>
        <input
          type="email"
          placeholder="assistant@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ padding: '0.5rem', width: '70%' }}
        />
        <button type="submit" disabled={sending} style={{ padding: '0.5rem 1rem', marginLeft: '0.5rem' }}>
          {sending ? 'Sending...' : 'Invite'}
        </button>
      </form>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {inviteLink && (
        <div style={{ marginTop: '1rem' }}>
          <p>Invite created! Share this link:</p>
          <code>{inviteLink}</code>
        </div>
      )}
    </div>
  )
}

export default Dashboard
