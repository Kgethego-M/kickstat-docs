const express = require('express')
const crypto = require('crypto')
const { Pool } = require('pg')
const { clerkClient } = require('@clerk/express')
const { requireAuth, getAuth } = require('../middleware/auth')

const router = express.Router()
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

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

    const squadId = squadResult.rows[0].id
    const token = crypto.randomBytes(24).toString('hex')

    const inviteResult = await pool.query(
      'INSERT INTO invites (email, squad_id, invited_by, token) VALUES ($1, $2, $3, $4) RETURNING id, token',
      [email, squadId, user.id, token]
    )

    const invite = inviteResult.rows[0]

    res.status(201).json({
      inviteId: invite.id,
      inviteLink: process.env.FRONTEND_URL + '/invite/' + invite.token,
    })
  } catch (err) {
    console.error('Create invite error:', err.message)
    res.status(500).json({ error: 'Failed to create invite' })
  }
})

// Accept an invite after the recipient has signed in.
// This links the Clerk user to the squad/athlete stored in the invite,
// replacing the default coach onboarding flow for invited users.
router.post('/accept', requireAuth(), async (req, res) => {
  try {
    const { userId: clerkId } = getAuth(req)
    const { token } = req.body

    if (!token) {
      return res.status(400).json({ error: 'Invite token is required' })
    }

    let email = null
    if (process.env.NODE_ENV === 'test') {
      email = req.headers['x-test-invite-email'] || null
    } else {
      const clerkUser = await clerkClient.users.getUser(clerkId)
      email = clerkUser.primaryEmailAddress?.emailAddress
    }

    if (!email) {
      return res.status(400).json({ error: 'Could not resolve user email' })
    }

    const client = await pool.connect()
    try {
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

      if (invite.email.toLowerCase() !== email.toLowerCase()) {
        await client.query('ROLLBACK')
        return res.status(403).json({ error: 'Invite email does not match signed-in user' })
      }

      const existingUser = await client.query(
        'SELECT id FROM users WHERE clerk_id = $1 FOR UPDATE',
        [clerkId]
      )

      let userId
      if (existingUser.rows.length > 0) {
        userId = existingUser.rows[0].id
        await client.query(
          'UPDATE users SET role = $1, squad_id = $2 WHERE id = $3',
          [invite.role, invite.squad_id, userId]
        )
      } else {
        const inserted = await client.query(
          'INSERT INTO users (clerk_id, role, squad_id) VALUES ($1, $2, $3) RETURNING id',
          [clerkId, invite.role, invite.squad_id]
        )
        userId = inserted.rows[0].id
      }

      if (invite.role === 'athlete' && invite.athlete_id) {
        await client.query(
          'UPDATE athletes SET user_id = $1 WHERE id = $2',
          [userId, invite.athlete_id]
        )
      }

      await client.query(
        "UPDATE invites SET status = 'accepted' WHERE id = $1",
        [invite.id]
      )

      await client.query('COMMIT')

      res.json({
        role: invite.role,
        squadId: invite.squad_id,
        athleteId: invite.role === 'athlete' ? invite.athlete_id : null,
      })
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  } catch (err) {
    console.error('Accept invite error:', err.message)
    res.status(500).json({ error: 'Failed to accept invite' })
  }
})

module.exports = router
