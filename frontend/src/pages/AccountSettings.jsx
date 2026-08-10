import { UserProfile } from '@clerk/clerk-react'
import Layout from '../components/Layout'
import './AccountSettings.css'

function AccountSettings() {
  return (
    <Layout>
      <div className="settings-header">
        <span className="dashboard-eyebrow">Account</span>
        <h1>Account settings</h1>
      </div>
      <div className="settings-panel">
        <UserProfile />
      </div>
    </Layout>
  )
}

export default AccountSettings