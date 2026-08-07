import { UserButton, useUser } from '@clerk/clerk-react'

function Dashboard() {
  const { user } = useUser()

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>Dashboard</h1>
      <p>Welcome, {user?.primaryEmailAddress?.emailAddress}</p>
      <UserButton />
    </div>
  )
}

export default Dashboard
