import { useParams } from 'react-router-dom'
import { SignedIn, SignedOut, SignUpButton, SignInButton, useUser } from '@clerk/clerk-react'
import Layout from '../components/Layout'

function InviteAccept() {
  const { token } = useParams()
  const { user } = useUser()

  return (
    <Layout>
      <div className="dashboard-header">
        <span className="dashboard-eyebrow">Invite</span>
        <h1>You've been invited!</h1>
        <p>Sign up to join as an assistant.</p>
      </div>

      <SignedOut>
        <SignUpButton mode="modal" />
        <span style={{ margin: '0 1rem' }} />
        <SignInButton mode="modal" />
      </SignedOut>

      <SignedIn>
        <p>You're signed in as {user?.primaryEmailAddress?.emailAddress}.</p>
        <p>
          If your account was linked to this invite, you should now be an assistant.
          Go to your <a href="/dashboard">Dashboard</a> to check.
        </p>
      </SignedIn>

      <p style={{ marginTop: '2rem', fontSize: '0.8rem', color: '#888' }}>
        Invite token: {token}
      </p>
    </Layout>
  )
}

export default InviteAccept
