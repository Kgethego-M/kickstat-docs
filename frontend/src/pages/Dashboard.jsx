import { useUser } from '@clerk/clerk-react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import './Dashboard.css'

function Dashboard() {
  const { user } = useUser()
  const firstName = user?.firstName || user?.primaryEmailAddress?.emailAddress || 'Coach'

  return (
    <Layout>
      <div className="dashboard-header">
        <span className="dashboard-eyebrow">Overview</span>
        <h1>Welcome back, {firstName}</h1>
      </div>
      <div className="dashboard-grid">
        <Link to="/roster" className="dashboard-card">
          <h3>Roster</h3>
          <p>Manage your squad and keep athlete details up to date.</p>
        </Link>
        <Link to="/settings" className="dashboard-card">
          <h3>Account</h3>
          <p>Update your profile, password, or delete your account.</p>
        </Link>
      </div>
    </Layout>
  )
}

export default Dashboard