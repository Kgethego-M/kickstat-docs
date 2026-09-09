const express = require('express')
const crypto = require('crypto')
const { Pool } = require('pg')
const { clerkClient } = require('@clerk/express')
const { requireAuth, getAuth } = require('../middleware/auth')
const { sendInviteEmail } = require('../lib/email')

const router = express.Router()
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

// Shared by the assistant-invite form (Dashboard.jsx / Setup.jsx) and the
// athlete-invite path (athletes.js, when an email is given on the add-athlete
// form) — same token mechanism, distinguished by `role` and, for athletes,
// `athlete_id`. Also sends the actual invite email now, rather than just
// handing back a link to copy/paste.
async function createInvite(pool, { email, squadId, invitedBy, role = 'assistant', athleteId = null }) {
  // Don't silently create a second invite for someone who's already been
  // invited (or has already joined) this squad.
  const existing = await pool.query(
    "SELECT id, status FROM invites WHERE email = $1 AND squad_id = $2 AND status IN ('pending','accepted') LIMIT 1",
    [email, squadId]
  )
  if (existing.rows.length > 0) {
    const err = new Error(
      existing.rows[0].status === 'accepted'
        ? 'This person has already joined the squad'
        : 'An invite has already been sent to this email'
    )
    err.status = 409
    throw err
  }

  const token = crypto.randomBytes(24).toString('hex')

  const result = await pool.query(
    `INSERT INTO invites (email, squad_id, invited_by, token, role, athlete_id)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, token`,
    [email, squadId, invitedBy, token, role, athleteId]
  )

  const squadResult = await pool.query('SELECT name FROM squads WHERE id = $1', [squadId])
  const squadName = squadResult.rows[0]?.name || 'the squad'
  const inviteLink = process.env.FRONTEND_URL + '/invite/' + result.rows[0].token

  await sendInviteEmail({ to: email, role, inviteLink, squadName })

  return {
    inviteId: result.rows[0].id,
    // Still returned so the coach has a manual fallback/confirmation — the
    // frontend no longer treats this as the primary way to deliver it.
    inviteLink,
  }
}

router.post('/', requireAuth(), async (req, res) => {
  try {
    const { userId: clerkId } = getAuth(req)
    const { email } = req.body

    if (!email) {
      return res.status(400).json({ error: 'Email is required' })
    }

    const userResult = await pool.query(
      'SELECT id, role FROM users WHERE clerk_id = $1',
      [clerkId]
    )

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    const user = userResult.rows[0]

    if (user.role !== 'coach') {
      return res.status(403).json({ error: 'Only coaches can invite assistants' })
    }

    const squadResult = await pool.query(
      'SELECT id FROM squads WHERE coach_id = $1',
      [user.id]
    )

    if (squadResult.rows.length === 0) {
      return res.status(400).json({ error: 'Coach has no squad' })
    }

    const invite = await createInvite(pool, {
      email,
      squadId: squadResult.rows[0].id,
      invitedBy: user.id,
      role: 'assistant',
    })

    res.status(201).json(invite)
  } catch (err) {
    console.error('Create invite error:', err.message)
    const status = err.status || 500
    res.status(status).json({ error: status === 409 ? err.message : 'Failed to create invite' })
  }
})

// POST /api/invites/:token/accept — links a newly-signed-up Clerk account to
// the squad/role/athlete row an invite was created for. The signed-in user's
// email must match the invite email to prevent invite-link sharing.
router.post('/:token/accept', requireAuth(), async (req, res) => {
  const client = await pool.connect()
  try {
    const { userId: clerkId } = getAuth(req)
    const { token } = req.params

    let email = null
    if (process.env.NODE_ENV === 'test') {
      email = req.headers['x-test-invite-email'] || null
    } else {
      const clerkUser = await clerkClient.users.getUser(clerkId)
      email = clerkUser.primaryEmailAddress?.emailAddress
    }

    await client.query('BEGIN')

    const inviteResult = await client.query(
      "SELECT * FROM invites WHERE token = $1 AND status = 'pending' FOR UPDATE",
      [token]
    )

    if (inviteResult.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Invite not found or already used' })
    }

    const invite = inviteResult.rows[0]

    // In production we verify the signed-in Clerk account's email matches the
    // invite, so an invite link can't be accepted by a different user. In tests
    // the header is optional — if omitted we skip the check to keep fixtures
    // simple; if provided it must match.
    if (email && invite.email.toLowerCase() !== email.toLowerCase()) {
      await client.query('ROLLBACK')
      return res.status(403).json({ error: 'Invite email does not match signed-in user' })
    }

    const userResult = await client.query(
      `INSERT INTO users (clerk_id, role, squad_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (clerk_id) DO UPDATE
         SET role = EXCLUDED.role, squad_id = EXCLUDED.squad_id
       RETURNING id`,
      [clerkId, invite.role, invite.squad_id]
    )
    const userId = userResult.rows[0].id

    if (invite.role === 'athlete' && invite.athlete_id) {
      await client.query(
        'UPDATE athletes SET user_id = $1 WHERE id = $2 AND squad_id = $3',
        [userId, invite.athlete_id, invite.squad_id]
      )
    }

    await client.query("UPDATE invites SET status = 'accepted' WHERE id = $1", [invite.id])

    await client.query('COMMIT')

    const response = {
      role: invite.role,
      squadId: invite.squad_id,
    }
    if (invite.role === 'athlete' && invite.athlete_id) {
      response.athleteId = invite.athlete_id
    }

    res.json(response)
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Accept invite error:', err.message)
    res.status(500).json({ error: 'Failed to accept invite' })
  } finally {
    client.release()
  }
})

// GET /api/invites/verify/:token — public lookup so InviteAccept.jsx can show
// a friendly message before the recipient signs in.
router.get('/verify/:token', async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT email, squad_id, role, status FROM invites WHERE token = $1",
      [req.params.token]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invite not found' })
    }

    const invite = result.rows[0]
    if (invite.status !== 'pending') {
      return res.status(410).json({ error: 'Invite has already been used' })
    }

    res.json({ email: invite.email, role: invite.role })
  } catch (err) {
    console.error('Verify invite error:', err.message)
    res.status(500).json({ error: 'Failed to verify invite' })
  }
})

module.exports = router
module.exports.createInvite = createInvite
