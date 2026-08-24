import { useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { apiRequest } from '../lib/api'
import './Setup.css'

function Setup() {
  const { getToken } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState('name') // name | assistant | roster
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [squadName, setSquadName] = useState('')

  const [assistantEmail, setAssistantEmail] = useState('')
  const [assistantInviteLink, setAssistantInviteLink] = useState(null)

  const [athleteForm, setAthleteForm] = useState({ name: '', position: '', squad_number: '', email: '' })
  const [athletes, setAthletes] = useState([])

  async function handleNameSubmit(e) {
    e.preventDefault()
    if (!squadName.trim()) {
      setError('Squad name is required')
      return
    }
    setSaving(true)
    setError('')
    try {
      await apiRequest('/api/squads/mine', {
        method: 'PATCH',
        body: { name: squadName.trim() },
        getToken,
      })
      setStep('assistant')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleInviteAssistant(e) {
    e.preventDefault()
    if (!assistantEmail.trim()) {
      setStep('roster')
      return
    }
    setSaving(true)
    setError('')
    try {
      const data = await apiRequest('/api/invites', {
        method: 'POST',
        body: { email: assistantEmail.trim() },
        getToken,
      })
      setAssistantInviteLink(data.inviteLink)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleAddAthlete(e) {
    e.preventDefault()
    if (!athleteForm.name.trim()) {
      setError('Athlete name is required')
      return
    }
    setSaving(true)
    setError('')
    try {
      const created = await apiRequest('/api/athletes', {
        method: 'POST',
        body: {
          name: athleteForm.name.trim(),
          position: athleteForm.position.trim() || null,
          squad_number: athleteForm.squad_number ? Number(athleteForm.squad_number) : null,
          email: athleteForm.email.trim() || null,
        },
        getToken,
      })
      setAthletes((prev) => [...prev, created])
      setAthleteForm({ name: '', position: '', squad_number: '', email: '' })
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function finishSetup() {
    setSaving(true)
    setError('')
    try {
      await apiRequest('/api/squads/mine', {
        method: 'PATCH',
        body: { onboarded: true },
        getToken,
      })
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Layout>
      <div className="setup-header">
        <span className="dashboard-eyebrow">Welcome</span>
        <h1>Let's set up your squad</h1>
      </div>

      <div className="setup-steps">
        <span className={step === 'name' ? 'setup-step-active' : ''}>1. Squad name</span>
        <span className={step === 'assistant' ? 'setup-step-active' : ''}>2. Invite an assistant</span>
        <span className={step === 'roster' ? 'setup-step-active' : ''}>3. Add your roster</span>
      </div>

      {error && <div className="roster-error">{error}</div>}

      {step === 'name' && (
        <form className="roster-form" onSubmit={handleNameSubmit}>
          <h3>What's your squad called?</h3>
          <div className="roster-form-grid">
            <label className="roster-form-wide">
              Squad name
              <input
                type="text"
                value={squadName}
                onChange={(e) => setSquadName(e.target.value)}
                required
                autoFocus
              />
            </label>
          </div>
          <div className="roster-form-actions">
            <button type="submit" className="btn btn-gold" disabled={saving}>
              {saving ? 'Saving...' : 'Next'}
            </button>
          </div>
        </form>
      )}

      {step === 'assistant' && (
        <form className="roster-form" onSubmit={handleInviteAssistant}>
          <h3>Invite an assistant (optional)</h3>
          <p className="setup-step-hint">
            Assistants can log live events but can't edit your roster. You can invite more later from the Dashboard.
          </p>
          <div className="roster-form-grid">
            <label className="roster-form-wide">
              Assistant's email
              <input
                type="email"
                value={assistantEmail}
                onChange={(e) => setAssistantEmail(e.target.value)}
                placeholder="assistant@example.com"
              />
            </label>
          </div>
          {assistantInviteLink && (
            <div className="roster-invite-created">
              <p>Invite created — share this link:</p>
              <code>{assistantInviteLink}</code>
            </div>
          )}
          <div className="roster-form-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setStep('roster')}>
              Skip
            </button>
            <button type="submit" className="btn btn-gold" disabled={saving}>
              {saving ? 'Sending...' : assistantInviteLink ? 'Continue' : 'Send invite'}
            </button>
          </div>
        </form>
      )}

      {step === 'roster' && (
        <>
          <form className="roster-form" onSubmit={handleAddAthlete}>
            <h3>Add your athletes</h3>
            <div className="roster-form-grid">
              <label>
                Name
                <input
                  type="text"
                  value={athleteForm.name}
                  onChange={(e) => setAthleteForm({ ...athleteForm, name: e.target.value })}
                  required
                />
              </label>
              <label>
                Position
                <input
                  type="text"
                  value={athleteForm.position}
                  onChange={(e) => setAthleteForm({ ...athleteForm, position: e.target.value })}
                  placeholder="e.g. Midfielder"
                />
              </label>
              <label>
                Squad number
                <input
                  type="number"
                  min="0"
                  value={athleteForm.squad_number}
                  onChange={(e) => setAthleteForm({ ...athleteForm, squad_number: e.target.value })}
                />
              </label>
              <label>
                Athlete's login email (optional)
                <input
                  type="email"
                  value={athleteForm.email}
                  onChange={(e) => setAthleteForm({ ...athleteForm, email: e.target.value })}
                />
              </label>
            </div>
            <div className="roster-form-actions">
              <button type="submit" className="btn btn-gold" disabled={saving}>
                {saving ? 'Adding...' : 'Add athlete'}
              </button>
            </div>
          </form>

          {athletes.length > 0 && (
            <ul className="setup-athlete-list">
              {athletes.map((a) => (
                <li key={a.id}>
                  {a.squad_number != null ? `#${a.squad_number} ` : ''}
                  {a.name}
                </li>
              ))}
            </ul>
          )}

          <div className="roster-form-actions setup-finish-row">
            <button type="button" className="btn btn-gold" onClick={finishSetup} disabled={saving}>
              {athletes.length === 0 ? "I'll add athletes later" : 'Finish setup'}
            </button>
          </div>
        </>
      )}
    </Layout>
  )
}

export default Setup
