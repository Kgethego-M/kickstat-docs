import { Link, useLocation } from 'react-router-dom'
import { UserButton } from '@clerk/clerk-react'
import './Layout.css'

function Layout({ children }) {
  const location = useLocation()

  const navItem = (to, label) => (
    <Link to={to} className={`nav-link ${location.pathname === to ? 'nav-link-active' : ''}`}>
      {label}
    </Link>
  )

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="app-crest">
          <span className="app-crest-mark">SC</span>
          <span className="app-crest-name">Sport Coaching</span>
        </div>
        <nav className="app-nav">
          {navItem('/dashboard', 'Dashboard')}
          {navItem('/roster', 'Roster')}
          {navItem('/events', 'Events')}
          {navItem('/settings', 'Account')}
        </nav>
        <div className="app-sidebar-footer">
          <UserButton />
        </div>
      </aside>
      <main className="app-main">{children}</main>
    </div>
  )
}

export default Layout