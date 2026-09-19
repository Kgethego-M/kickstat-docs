import { SignIn, SignedIn } from '@clerk/clerk-react'
import { Navigate } from 'react-router-dom'
import './AuthLayout.css'

const clerkAppearance = {
  variables: {
    colorPrimary: '#0250B0',
    colorText: '#0B1B33',
    borderRadius: '8px',
  },
}

function SignInPage() {
  return (
    <>
      <SignedIn>
        <Navigate to="/dashboard" replace />
      </SignedIn>
      <div className="auth-shell">
        <div className="auth-brand-panel">
          <div className="auth-brand-overlay">
            <img src="/logo-crest-reversed.svg" alt="KickStat" className="auth-brand-logo" />
            <p className="auth-brand-tagline">Welcome back to your squad.</p>
          </div>
        </div>
        <div className="auth-form-panel">
          <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" appearance={clerkAppearance} />
        </div>
      </div>
    </>
  )
}

export default SignInPage