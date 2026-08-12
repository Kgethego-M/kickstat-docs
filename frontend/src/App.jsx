import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Roster from './pages/Roster'
import AccountSettings from './pages/AccountSettings'
import InviteAccept from './pages/InviteAccept'
import ProtectedRoute from './components/ProtectedRoute'

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
        path="/roster"
        element={
          <ProtectedRoute>
            <Roster />
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
