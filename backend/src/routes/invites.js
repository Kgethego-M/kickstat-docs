const express = require('express')
const crypto = require('crypto')
const { Pool } = require('pg')
const { requireAuth, getAuth } = require('../middleware/auth')

const router = express.Router()
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

// Shared by the assistant-invite form (Dashboard.jsx) and the athlete-invite
// path (athletes.js, when an email is given on the add-athlete form) — same
// token mechanism, distinguished by `role` and, for athletes, `athlete_id`.
async function createInvite(pool, { email, squadId, invitedBy, role = 'assistant', athleteId = null }) {
  const token = crypto.randomBytes(24).toString('hex')

  const result = await pool.query(
    `INSERT INTO invites (email, squad_id, invited_by, token, role, athlete_id)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, token`,
    [email, squadId, invitedBy, token, role, athleteId]
  )

  return {
    inviteId: result.rows[0].id,
    inviteLink: process.env.FRONTEND_URL + '/invite/' + result.rows[0].token,
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
    res.status(500).json({ error: 'Failed to create invite' })
  }
})

// POST /api/invites/:token/accept — the single source of truth for linking a
// newly-signed-up Clerk account to the squad/role/athlete row an invite was
// created for. Called explicitly by InviteAccept.jsx once the user is signed
// in, rather than relying on Clerk's webhook (which has no way to know which
// of our invite tokens a given signup corresponds to, and can race against
// _squad.js's own self-heal logic).
router.post('/:token/accept', requireAuth(), async (req, res) => {
  try {
    const { userId: clerkId } = getAuth(req)
    const { token } = req.params

    const inviteResult = await pool.query(
      "SELECT * FROM invites WHERE token = $1 AND status = 'pending'",
      [token]
    )

    if (inviteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invite not found or already used' })
    }

    const invite = inviteResult.rows[0]

    // Upsert: covers both "no users row yet" and "_squad.js's self-heal
    // already created a default coach+squad for this clerk_id before this
    // ran" — either way, this invite's role/squad wins.
    const userResult = await pool.query(
      `INSERT INTO users (clerk_id, role, squad_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (clerk_id) DO UPDATE
         SET role = EXCLUDED.role, squad_id = EXCLUDED.squad_id
       RETURNING id`,
      [clerkId, invite.role, invite.squad_id]
    )
    const userId = userResult.rows[0].id

    if (invite.role === 'athlete' && invite.athlete_id) {
      await pool.query(
        'UPDATE athletes SET user_id = $1 WHERE id = $2 AND squad_id = $3',
        [userId, invite.athlete_id, invite.squad_id]
      )
    }

    await pool.query("UPDATE invites SET status = 'accepted' WHERE id = $1", [invite.id])

    res.json({ role: invite.role, squadId: invite.squad_id })
  } catch (err) {
    console.error('Accept invite error:', err.message)
    res.status(500).json({ error: 'Failed to accept invite' })
  }
})

module.exports = router
module.exports.createInvite = createInvite
