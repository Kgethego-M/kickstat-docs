const express = require('express');
const { Pool } = require('pg');
const { requireAuth, getAuth } = require('../middleware/auth');
const { getOwnedSquadId } = require('./_squad');

const router = express.Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// GET /api/squads/mine — get the logged-in coach's squad, creating one if it doesn't exist yet
router.get('/mine', requireAuth(), async (req, res) => {
  try {
    const { userId: clerkUserId } = getAuth(req);
    const squadId = await getOwnedSquadId(pool, clerkUserId);

    const result = await pool.query('SELECT * FROM squads WHERE id = $1', [squadId]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching/creating squad:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/squads/mine — rename the logged-in coach's squad
router.patch('/mine', requireAuth(), async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Squad name is required' });
    }

    const { userId: clerkUserId } = getAuth(req);
    const squadId = await getOwnedSquadId(pool, clerkUserId);

    const result = await pool.query(
      'UPDATE squads SET name = $1 WHERE id = $2 RETURNING *',
      [name.trim(), squadId]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating squad:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
