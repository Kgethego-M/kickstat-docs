import { useState, useEffect, useCallback } from 'react'
import { useAuth, UserProfile } from '@clerk/clerk-react'
import Layout from '../components/Layout'
import { apiRequest } from '../lib/api'
import './AccountSettings.css'

function AccountSettings() {
  const { getToken } = useAuth()
  const [teamName, setTeamName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const loadSquad = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const squad = await apiRequest('/api/squads/mine', { getToken })
      setTeamName(squad.name || '')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [getToken])

  useEffect(() => {
    loadSquad()
  }, [loadSquad])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!teamName.trim()) {
      setError('Team name is required')
      return
    }

    setSaving(true)
    setError('')
    setSaved(false)

    try {
      await apiRequest('/api/squads/mine', {
        method: 'PATCH',
        body: { name: teamName.trim() },
        getToken,
      })
      setSaved(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Layout>
      <div className="settings-header">
        <span className="dashboard-eyebrow">Account</span>
        <h1>Account settings</h1>
      </div>

      <form className="roster-form" onSubmit={handleSubmit}>
        <h3>Team</h3>
        {loading ? (
          <p className="roster-status">Loading team details...</p>
        ) : (
          <>
            <div className="roster-form-grid">
              <label className="roster-form-wide">
                Team name
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => { setTeamName(e.target.value); setSaved(false) }}
                  required
                />
              </label>
            </div>
            <div className="roster-form-actions">
              <button type="submit" className="btn btn-gold" disabled={saving}>
                {saving ? 'Saving...' : 'Save team name'}
              </button>
            </div>
            {saved && <p className="settings-saved">Team name updated.</p>}
          </>
        )}
        {error && <div className="roster-error">{error}</div>}
      </form>

      <div className="settings-panel">
        <UserProfile />
      </div>
    </Layout>
  )
}

export default AccountSettings