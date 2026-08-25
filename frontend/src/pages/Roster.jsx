import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { apiRequest } from '../lib/api'
import './Roster.css'

const emptyForm = {
  name: '',
  position: '',
  squad_number: '',
  date_of_birth: '',
  contact_info: '',
  email: '',
}

function Roster() {
  const { getToken } = useAuth()
  const [athletes, setAthletes] = useState([])
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [inviteLink, setInviteLink] = useState(null)

  const isCoach = role === 'coach'

  const loadAccount = useCallback(async () => {
    try {
      const me = await apiRequest('/api/account/me', { getToken })
      setRole(me.role)
    } catch {
      setRole('coach')
    }
  }, [getToken])

  const loadAthletes = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await apiRequest('/api/athletes', { getToken })
      setAthletes(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [getToken])

  useEffect(() => {
    loadAccount()
    loadAthletes()
  }, [loadAccount, loadAthletes])

  function openAddForm() {
    setForm(emptyForm)
    setEditingId(null)
    setInviteLink(null)
    setFormOpen(true)
  }

  function openEditForm(athlete) {
    setForm({
      name: athlete.name || '',
      position: athlete.position || '',
      squad_number: athlete.squad_number ?? '',
      date_of_birth: athlete.date_of_birth ? athlete.date_of_birth.slice(0, 10) : '',
      contact_info: athlete.contact_info || '',
      email: athlete.email || '',
    })
    setEditingId(athlete.id)
    setInviteLink(null)
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setForm(emptyForm)
    setEditingId(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('Athlete name is required')
      return
    }

    setSaving(true)
    setError('')
    setInviteLink(null)

    const payload = {
      name: form.name.trim(),
      position: form.position.trim() || null,
      squad_number: form.squad_number ? Number(form.squad_number) : null,
      date_of_birth: form.date_of_birth || null,
      contact_info: form.contact_info.trim() || null,
      email: form.email.trim() || null,
    }

    try {
      if (editingId) {
        await apiRequest(`/api/athletes/${editingId}`, {
          method: 'PATCH',
          body: payload,
          getToken,
        })
      } else {
        const created = await apiRequest('/api/athletes', {
          method: 'POST',
          body: payload,
          getToken,
        })
        if (created.inviteLink) {
          setInviteLink(created.inviteLink)
        }
      }
      closeForm()
      await loadAthletes()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Remove this athlete from the roster?')) return
    try {
      await apiRequest(`/api/athletes/${id}`, { method: 'DELETE', getToken })
      await loadAthletes()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <Layout>
      <div className="roster-header">
        <div>
          <span className="dashboard-eyebrow">Squad</span>
          <h1>Roster</h1>
        </div>
        {isCoach && (
          <button className="btn btn-gold" onClick={openAddForm}>
            Add athlete
          </button>
        )}
      </div>

      {error && <div className="roster-error">{error}</div>}

      {formOpen && isCoach && (
        <form className="roster-form" onSubmit={handleSubmit}>
          <h3>{editingId ? 'Edit athlete' : 'Add athlete'}</h3>
          <div className="roster-form-grid">
            <label>
              Name
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </label>
            <label>
              Position
              <input
                type="text"
                value={form.position}
                onChange={(e) => setForm({ ...form, position: e.target.value })}
                placeholder="e.g. Midfielder"
              />
            </label>
            <label>
              Squad number
              <input
                type="number"
                min="0"
                value={form.squad_number}
                onChange={(e) => setForm({ ...form, squad_number: e.target.value })}
              />
            </label>
            <label>
              Date of birth
              <input
                type="date"
                value={form.date_of_birth}
                onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
              />
            </label>
            <label className="roster-form-wide">
              Contact info
              <input
                type="text"
                value={form.contact_info}
                onChange={(e) => setForm({ ...form, contact_info: e.target.value })}
                placeholder="Phone or email"
              />
            </label>
            <label className="roster-form-wide">
              Login email (optional invite)
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="athlete@example.com"
              />
            </label>
          </div>
          <div className="roster-form-actions">
            <button type="button" className="btn btn-ghost" onClick={closeForm}>
              Cancel
            </button>
            <button type="submit" className="btn btn-gold" disabled={saving}>
              {saving ? 'Saving...' : 'Save athlete'}
            </button>
          </div>
        </form>
      )}

      {inviteLink && (
        <div className="dashboard-card" style={{ marginTop: '1rem' }}>
          <p>Invite created! Share this link with the athlete:</p>
          <code>{inviteLink}</code>
        </div>
      )}

      {loading ? (
        <p className="roster-status">Loading roster...</p>
      ) : athletes.length === 0 ? (
        <div className="roster-empty">
          <p>No athletes yet. {isCoach ? 'Add your first athlete to start building your squad.' : 'Your coach will add athletes here.'}</p>
        </div>
      ) : (
        <div className="roster-grid">
          {athletes.map((athlete) => (
            <div className="athlete-card" key={athlete.id}>
              <Link to={`/roster/${athlete.id}`} className="athlete-card-main">
                <div className="athlete-number">
                  {athlete.squad_number != null ? athlete.squad_number : '—'}
                </div>
                <div className="athlete-info">
                  <h3>{athlete.name}</h3>
                  {athlete.position && <span className="athlete-position">{athlete.position}</span>}
                </div>
              </Link>
              {isCoach && (
                <div className="athlete-actions">
                  <button className="btn btn-ghost" onClick={() => openEditForm(athlete)}>
                    Edit
                  </button>
                  <button className="btn btn-danger" onClick={() => handleDelete(athlete.id)}>
                    Remove
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Layout>
  )
}

export default Roster
