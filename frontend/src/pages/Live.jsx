import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { Navigate } from 'react-router-dom'
import Layout from '../components/Layout'
import Loader from '../components/Loader'
import { apiRequest } from '../lib/api'
import './Live.css'

function Live() {
  const { getToken } = useAuth()
  const [liveEvent, setLiveEvent] = useState(undefined) // undefined = loading, null = none found
  const [error, setError] = useState('')

  useEffect(() => {
    async function find() {
      try {
        const events = await apiRequest('/api/events', { getToken })
        setLiveEvent(events.find((e) => e.status === 'live') || null)
      } catch (err) {
        setError(err.message)
        setLiveEvent(null)
      }
    }
    find()
    // Keep checking so an event the backend sweep auto-starts pulls the
    // coach into the live view without a manual refresh.
    const poll = setInterval(find, 15000)
    return () => clearInterval(poll)
  }, [getToken])

  if (liveEvent === undefined) {
    return (
      <Layout>
        <Loader label="Checking for a live event..." />
      </Layout>
    )
  }

  if (liveEvent) {
    return <Navigate to={`/live/${liveEvent.id}`} replace />
  }

  return (
    <Layout>
      <div className="live-empty">
        <span className="dashboard-eyebrow">Live</span>
        <h1>No live event right now</h1>
        <p>Start an event from the Events page to begin logging live.</p>
        {error && <div className="roster-error">{error}</div>}
        <a className="btn btn-gold" href="/events">Go to Events</a>
      </div>
    </Layout>
  )
}

export default Live