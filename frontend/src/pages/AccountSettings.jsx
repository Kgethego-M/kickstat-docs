import { UserProfile } from '@clerk/clerk-react'

function AccountSettings() {
  return (
    <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center' }}>
      <UserProfile />
    </div>
  )
}

export default AccountSettings
