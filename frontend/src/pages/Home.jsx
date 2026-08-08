import { SignedIn, SignedOut, SignInButton, SignUpButton } from '@clerk/clerk-react'
import { Navigate } from 'react-router-dom'

function Home() {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>Sport Coaching Tool</h1>

      <SignedOut>
        <SignInButton mode="modal" />
        <span style={{ margin: '0 1rem' }} />
        <SignUpButton mode="modal" />
      </SignedOut>

      <SignedIn>
        <Navigate to="/dashboard" replace />
      </SignedIn>
    </div>
  )
}

export default Home
