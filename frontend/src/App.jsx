import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from '@clerk/clerk-react'
import './App.css'

function App() {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>Sport Coaching Tool</h1>

      <SignedOut>
        <SignInButton mode="modal" />
        <span style={{ margin: '0 1rem' }} />
        <SignUpButton mode="modal" />
      </SignedOut>

      <SignedIn>
        <p>You're signed in!</p>
        <UserButton />
      </SignedIn>
    </div>
  )
}

export default App
