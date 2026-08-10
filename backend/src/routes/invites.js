const express = require('express')
const crypto = require('crypto')
const { Pool } = require('pg')
const { getAuth } = require('../middleware/auth')

const router = express.Router()
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

router.post('/', async (req, res) => {
  try {
    const { userId } = getAuth(req)

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    const clerkId = userId
    console.log('DEBUG clerkId:', clerkId)
    const { email } = req.body

    if (!email) {
      return res.status(400).json({ error: 'Email is required' })
    }
    const userResult = await pool.query(
      'SELECT id, role, squad_id FROM users WHERE clerk_id = $1',
      [clerkId]
    )

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    const user = userResult.rows[0]

    if (user.role !== 'coach') {
      return res.status(403).json({ error: 'Only coaches can invite assistants' })
    }

    if (!user.squad_id) {
      return res.status(400).json({ error: 'Coach has no squad' })
    }

    // Generate a unique token
    const token = crypto.randomBytes(24).toString('hex')

    const inviteResult = await pool.query(
      `INSERT INTO invites (email, squad_id, invited_by, token)
       VALUES ($1, $2, $3, $4) RETURNING id, token`,
      [email, user.squad_id, user.id, token]
    )

    const invite = inviteResult.rows[0]

    res.status(201).json({
      inviteId: invite.id,
      inviteLink: `${process.env.FRONTEND_URL}/invite/${invite.token}`,
    })
  } catch (err) {
    console.error('Create invite error:', err.message)
    res.status(500).json({ error: 'Failed to create invite' })
  }
})

module.exports = router
