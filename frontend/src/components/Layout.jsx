import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth, UserButton } from '@clerk/clerk-react'
import ThemeToggle from './ThemeToggle'
import { apiRequest } from '../lib/api'
import './Layout.css'

function Layout({ children }) {
  const location = useLocation()
  const { getToken } = useAuth()
  const [role, setRole] = useState(null)

  useEffect(() => {
    let cancelled = false
    apiRequest('/api/account/me', { getToken })
      .then((me) => {
        if (!cancelled) setRole(me.role)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [getToken])

  // Players watch live scores from their dashboard instead — the live match
  // centre is a staff-only logging UI, so the nav item is hidden for them.
  const isAthlete = role === 'athlete'

  const navItem = (to, label) => {
    const isActive = location.pathname === to || location.pathname.startsWith(`${to}/`)
    return (
      <Link to={to} className={`nav-link ${isActive ? 'nav-link-active' : ''}`}>
        {label}
      </Link>
    )
  }

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="app-crest">
          <img src="/logo-crest-reversed.svg" alt="" className="app-crest-mark" />
          <span className="app-crest-name">KickStat</span>
        </div>
        <nav className="app-nav">
          {navItem('/dashboard', 'Dashboard')}
          {navItem('/roster', 'Roster')}
          {navItem('/compare', 'Compare')}
          {navItem('/tactics', 'Tactics')}
          {navItem('/sessions', 'Sessions')}
          {navItem('/events', 'Events')}
          {!isAthlete && navItem('/live', 'Live')}
          {navItem('/settings', 'Settings')}
        </nav>
        <div className="app-sidebar-footer">
          <ThemeToggle />
          <UserButton />
        </div>
      </aside>
      <main className="app-main">{children}</main>
    </div>
  )
}

export default Layout
