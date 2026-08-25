import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  SignedIn,
  SignedOut,
  SignUpButton,
  SignInButton,
  useUser,
  useAuth,
} from '@clerk/clerk-react'
import Layout from '../components/Layout'
import { apiRequest } from '../lib/api'

function InviteAccept() {
  const { token } = useParams()
  const { user } = useUser()
  const { getToken } = useAuth()
  const navigate = useNavigate()
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) {
      setStatus('')
      setError('')
      return
    }

    let cancelled = false

    async function acceptInvite() {
      setStatus('Accepting invite...')
      setError('')
      try {
        const data = await apiRequest('/api/invites/accept', {
          method: 'POST',
          body: { token },
          getToken,
        })
        if (cancelled) return

        if (data.role === 'athlete' && data.athleteId) {
          navigate(`/roster/${data.athleteId}`, { replace: true })
        } else {
          navigate('/dashboard', { replace: true })
        }
      } catch (err) {
        if (!cancelled) {
          setStatus('')
          setError(err.message || 'Failed to accept invite')
        }
      }
    }

    acceptInvite()

    return () => {
      cancelled = true
    }
  }, [user, token, navigate, getToken])

  return (
    <Layout>
      <div className="dashboard-header">
        <span className="dashboard-eyebrow">Invite</span>
        <h1>You&apos;ve been invited!</h1>
        <p>Sign in or sign up to join the squad.</p>
      </div>

      <SignedOut>
        <SignUpButton mode="modal" />
        <span style={{ margin: '0 1rem' }} />
        <SignInButton mode="modal" />
      </SignedOut>

      <SignedIn>
        <p>You&apos;re signed in as {user?.primaryEmailAddress?.emailAddress}.</p>
        {status && <p>{status}</p>}
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </SignedIn>
    </Layout>
  )
}

export default InviteAccept
