import { SignedIn, SignedOut, SignInButton, SignUpButton } from '@clerk/clerk-react'
import { Navigate } from 'react-router-dom'
import './Home.css'

function Home() {
  return (
    <div className="home-shell">
      <div className="home-panel">
        <span className="home-eyebrow">Matchday-ready</span>
        <h1 className="home-title">Sport Coaching Tool</h1>
        <p className="home-subtitle">
          Manage your squad, run live matchday logging, and keep every result on record.
        </p>
        <SignedOut>
          <div className="home-actions">
            <SignInButton mode="modal">
              <button className="btn btn-ghost">Sign in</button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="btn btn-gold">Create account</button>
            </SignUpButton>
          </div>
        </SignedOut>
        <SignedIn>
          <Navigate to="/dashboard" replace />
        </SignedIn>
      </div>
    </div>
  )
}

export default Home
