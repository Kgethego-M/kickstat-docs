import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Roster from './pages/Roster'
import AthleteStats from './pages/AthleteStats'
import Setup from './pages/Setup'
import AccountSettings from './pages/AccountSettings'
import InviteAccept from './pages/InviteAccept'
import Events from './pages/Events'
import EventDetail from './pages/EventDetail'
import Live from './pages/Live'
import LiveMatch from './pages/LiveMatch'
import ProtectedRoute from './components/ProtectedRoute'
import './App.css'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/setup"
        element={
          <ProtectedRoute>
            <Setup />
          </ProtectedRoute>
        }
      />
      <Route
        path="/roster"
        element={
          <ProtectedRoute>
            <Roster />
          </ProtectedRoute>
        }
      />
      <Route
        path="/roster/:id"
        element={
          <ProtectedRoute>
            <AthleteStats />
          </ProtectedRoute>
        }
      />
      <Route
        path="/events"
        element={
          <ProtectedRoute>
            <Events />
          </ProtectedRoute>
        }
      />
      <Route
        path="/events/:id"
        element={
          <ProtectedRoute>
            <EventDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/live"
        element={
          <ProtectedRoute>
            <Live />
          </ProtectedRoute>
        }
      />
      <Route
        path="/live/:id"
        element={
          <ProtectedRoute>
            <LiveMatch />
          </ProtectedRoute>
        }
      />
      <Route
        path="/live/fixture/:fixtureId"
        element={
          <ProtectedRoute>
            <LiveMatch />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <AccountSettings />
          </ProtectedRoute>
        }
      />
      <Route path="/invite/:token" element={<InviteAccept />} />
    </Routes>
  )
}

export default App
