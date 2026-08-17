const express = require('express');
const { Pool } = require('pg');
const { requireAuth, getAuth } = require('../middleware/auth');

const router = express.Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Get the logged-in coach's squad, creating one if it doesn't exist yet
router.get('/mine', requireAuth(), async (req, res) => {
  try {
    const { userId: clerkUserId } = getAuth(req);

    const userResult = await pool.query(
      'SELECT id FROM users WHERE clerk_id = $1',
      [clerkUserId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userId = userResult.rows[0].id;

    let squadResult = await pool.query(
      'SELECT * FROM squads WHERE coach_id = $1',
      [userId]
    );

    if (squadResult.rows.length === 0) {
      try {
        squadResult = await pool.query(
          'INSERT INTO squads (coach_id, name) VALUES ($1, $2) RETURNING *',
          [userId, 'My Squad']
        );
      } catch (insertErr) {
        // If a concurrent request already created the squad (unique constraint violation),
        // fetch the existing one instead of failing
        if (insertErr.code === '23505') {
          squadResult = await pool.query(
            'SELECT * FROM squads WHERE coach_id = $1',
            [userId]
          );
        } else {
          throw insertErr;
        }
      }
    }

    res.json(squadResult.rows[0]);
  } catch (err) {
    console.error('Error fetching/creating squad:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
