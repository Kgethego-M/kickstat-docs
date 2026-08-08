import { useAuth } from '@clerk/clerk-react'
import { Navigate } from 'react-router-dom'

function ProtectedRoute({ children }) {
  const { isLoaded, isSignedIn } = useAuth()

  if (!isLoaded) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>
  }

  if (!isSignedIn) {
    return <Navigate to="/" replace />
  }

  return children
}

export default ProtectedRoute
