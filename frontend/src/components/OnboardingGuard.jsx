// AI assistance: drafted with Claude (Sonnet 5) via claude.ai; reviewed and tested by the project team.
import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { Navigate, useLocation } from 'react-router-dom'
import { apiRequest } from '../lib/api'

function OnboardingGuard({ children }) {
  const { getToken, isLoaded, isSignedIn } = useAuth()
  const location = useLocation()
  const [squad, setSquad] = useState(null)
  const [loading, setLoading] = useState(true)
  const [initialLoadDone, setInitialLoadDone] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return

    async function loadSquad() {
      try {
        const data = await apiRequest('/api/squads/mine', { getToken })
        setSquad(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
        setInitialLoadDone(true)
      }
    }

    loadSquad()
  }, [isLoaded, isSignedIn, getToken])

  if (!isLoaded || (loading && !initialLoadDone)) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>
  }

  if (!isSignedIn) {
    return <Navigate to="/" replace />
  }

  if (error) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'red' }}>{error}</div>
  }

  const onSetupPage = location.pathname === '/setup'
  const needsSetup = squad && squad.onboarded === false

  if (needsSetup && !onSetupPage) {
    return <Navigate to="/setup" replace />
  }

  if (!needsSetup && onSetupPage) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

export default OnboardingGuard
