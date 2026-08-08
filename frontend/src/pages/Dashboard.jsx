import { UserButton, useUser } from '@clerk/clerk-react'
import { Link } from 'react-router-dom'

function Dashboard() {
  const { user } = useUser()

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>Dashboard</h1>
      <p>Welcome, {user?.primaryEmailAddress?.emailAddress}</p>
      <UserButton />
      <p>
        <Link to="/settings">Account Settings</Link>
      </p>
    </div>
  )
}

export default Dashboard
