const express = require('express')
const { Pool } = require('pg')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

router.delete('/me', requireAuth(), async (req, res) => {
  try {
    const clerkId = req.auth.userId

    const result = await pool.query(
      'DELETE FROM users WHERE clerk_id = $1 RETURNING id',
      [clerkId]
    )

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found in database' })
    }

    res.status(204).send()
  } catch (err) {
    console.error('Delete user error:', err.message)
    res.status(500).json({ error: 'Failed to delete user' })
  }
})

module.exports = router
