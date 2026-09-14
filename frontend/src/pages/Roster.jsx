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
  const [justAdded, setJustAdded] = useState(null)
  const [editMode, setEditMode] = useState(false)
  const [search, setSearch] = useState('')

  const isCoach = role === 'coach'

  const filteredAthletes = athletes.filter((athlete) =>
    athlete.name.toLowerCase().includes(search.trim().toLowerCase())
  )

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
    setJustAdded(null)
    setEditMode(false)
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
    setJustAdded(null)
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setForm(emptyForm)
    setEditingId(null)
    setJustAdded(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('Athlete name is required')
      return
    }

    const trimmedName = form.name.trim()
    const squadNumber = form.squad_number ? Number(form.squad_number) : null

    const duplicateName = athletes.find(
      (a) => a.id !== editingId && a.name.trim().toLowerCase() === trimmedName.toLowerCase()
    )
    if (duplicateName) {
      setError(`${trimmedName} is already on the roster.`)
      return
    }

    if (squadNumber != null) {
      const duplicateNumber = athletes.find(
        (a) => a.id !== editingId && a.squad_number === squadNumber
      )
      if (duplicateNumber) {
        setError(`Squad number ${squadNumber} is already taken by ${duplicateNumber.name}.`)
        return
      }
    }

    setSaving(true)
    setError('')
    setJustAdded(null)

    const payload = {
      name: trimmedName,
      position: form.position.trim() || null,
      squad_number: squadNumber,
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
        closeForm()
      } else {
        const emailToInvite = form.email.trim()
        const created = await apiRequest('/api/athletes', {
          method: 'POST',
          body: { ...payload, email: emailToInvite || null },
          getToken,
        })
        // Swap the form out for a confirmation immediately — no Save button
        // remains, so there's nothing left to double-click.
        setFormOpen(false)
        setJustAdded({
          name: created.name,
          invited: !!created.invite,
          email: emailToInvite,
        })
      }
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
          <div className="roster-header-actions">
            <button
              type="button"
              className={`btn-icon${editMode ? ' btn-icon-active' : ''}`}
              onClick={() => setEditMode((prev) => !prev)}
              title={editMode ? 'Done editing roster' : 'Edit roster'}
              aria-pressed={editMode}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 3a2.83 2.83 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                <path d="M15 5l4 4" />
              </svg>
            </button>
            <button className="btn btn-gold" onClick={openAddForm}>
              Add athlete
            </button>
          </div>
        )}
      </div>

      <div className="roster-search">
        <svg className="roster-search-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search athletes by name..."
        />
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
            {!editingId && (
              <label className="roster-form-wide">
                Athlete's login email (optional)
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="Sends them an invite email to create their own account"
                />
              </label>
            )}
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

      {justAdded && (
        <div className="roster-form roster-added-confirmation">
          <p>
            <strong>{justAdded.name}</strong> was added to the roster.
            {justAdded.invited && ` An invite email has been sent to ${justAdded.email}.`}
          </p>
          <div className="roster-form-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setJustAdded(null)}>
              Done
            </button>
            <button type="button" className="btn btn-gold" onClick={openAddForm}>
              Add another
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="roster-status">Loading roster...</p>
      ) : athletes.length === 0 ? (
        <div className="roster-empty">
          <p>No athletes yet. {isCoach ? 'Add your first athlete to start building your squad.' : 'Your coach will add athletes here.'}</p>
        </div>
      ) : filteredAthletes.length === 0 ? (
        <div className="roster-empty">
          <p>No athletes match "{search}".</p>
        </div>
      ) : (
        <div className="roster-grid">
          {filteredAthletes.map((athlete) => (
            <div className="athlete-card" key={athlete.id}>
              <Link to={`/roster/${athlete.id}`} className="athlete-card-main">
                <div className="athlete-number">
                  {athlete.squad_number != null ? athlete.squad_number : '—'}
                </div>
                <div className="athlete-info">
                  <h3>{athlete.name}
                  {athlete.is_injured && <span className="injury-badge" title="Currently injured">Injured</span>}
                  </h3>
                  {athlete.position && <span className="athlete-position">{athlete.position}</span>}
                </div>
              </Link>
              {isCoach && editMode && (
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
