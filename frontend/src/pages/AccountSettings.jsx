import { useState, useEffect, useCallback } from 'react'
import { useAuth, UserProfile } from '@clerk/clerk-react'
import Layout from '../components/Layout'
import Loader from '../components/Loader'
import { apiRequest } from '../lib/api'
import './AccountSettings.css'

function AccountSettings() {
  const { getToken, signOut } = useAuth()
  const [teamName, setTeamName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

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

  async function handleDeleteAccount(e) {
    e.preventDefault()
    if (deleteConfirmText !== 'DELETE') {
      setDeleteError('Please type DELETE to confirm')
      return
    }

    setDeleting(true)
    setDeleteError('')

    try {
      await apiRequest('/api/account/me', { method: 'DELETE', getToken })
      await signOut({ redirectUrl: '/' })
    } catch (err) {
      setDeleteError(err.message)
      setDeleting(false)
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
          <Loader label="Loading team details..." />
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

      <div className="dashboard-card" style={{ marginTop: '1.5rem', borderColor: '#dc2626' }}>
        <h3 style={{ color: '#dc2626' }}>Danger zone</h3>
        <p>Deleting your account will permanently remove your squad, athletes, events, and all data.</p>

        {!showDeleteConfirm ? (
          <button
            type="button"
            className="btn btn-danger"
            style={{ marginTop: '0.75rem' }}
            onClick={() => setShowDeleteConfirm(true)}
          >
            Delete account
          </button>
        ) : (
          <form onSubmit={handleDeleteAccount} style={{ marginTop: '0.75rem' }}>
            <label className="roster-form-wide">
              Type <strong>DELETE</strong> to confirm
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                required
              />
            </label>
            <div className="roster-form-actions" style={{ marginTop: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); setDeleteError('') }}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-danger" disabled={deleting}>
                {deleting ? 'Deleting...' : 'Permanently delete account'}
              </button>
            </div>
            {deleteError && <div className="roster-error" style={{ marginTop: '0.75rem' }}>{deleteError}</div>}
          </form>
        )}
      </div>
    </Layout>
  )
}

export default AccountSettings