import { SignUp, SignedIn } from '@clerk/clerk-react'
import { Navigate } from 'react-router-dom'
import './AuthLayout.css'

const clerkAppearance = {
  variables: {
    colorPrimary: '#0250B0',
    colorText: '#0B1B33',
    borderRadius: '8px',
  },
}

function SignUpPage() {
  return (
    <>
      <SignedIn>
        <Navigate to="/dashboard" replace />
      </SignedIn>
      <div className="auth-shell">
        <div className="auth-brand-panel">
          <div className="auth-brand-overlay">
            <img src="/logo-crest-reversed.svg" alt="KickStat" className="auth-brand-logo" />
            <p className="auth-brand-tagline">Set up your squad in minutes.</p>
          </div>
        </div>
        <div className="auth-form-panel">
          <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" appearance={clerkAppearance} />
        </div>
      </div>
    </>
  )
}

export default SignUpPage