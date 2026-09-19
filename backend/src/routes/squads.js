const express = require('express');
const pool = require('../db');
const { requireAuth, getAuth } = require('../middleware/auth');
const { getOwnedSquadId } = require('./_squad');

const router = express.Router();

// GET /api/squads/mine — get the logged-in user's squad, creating one if it doesn't exist yet
router.get('/mine', requireAuth(), async (req, res) => {
  try {
    const { userId: clerkUserId } = getAuth(req);
    const squadId = await getOwnedSquadId(pool, clerkUserId);

    const result = await pool.query(
      `SELECT s.*, COUNT(a.id)::int AS athlete_count
       FROM squads s
       LEFT JOIN athletes a ON a.squad_id = s.id
       WHERE s.id = $1
       GROUP BY s.id`,
      [squadId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching/creating squad:', err.message);
    const status = err.status || 500;
    res.status(status).json({ error: status === 403 ? err.message : 'Server error' });
  }
});

// PATCH /api/squads/mine — rename the squad and/or mark onboarding complete
router.patch('/mine', requireAuth(), async (req, res) => {
  try {
    const { name, onboarded } = req.body;

    if (name !== undefined && !name.trim()) {
      return res.status(400).json({ error: 'Squad name cannot be empty' });
    }

    const { userId: clerkUserId } = getAuth(req);
    const squadId = await getOwnedSquadId(pool, clerkUserId);

    const result = await pool.query(
      `UPDATE squads
       SET name = COALESCE($1, name),
           onboarded = COALESCE($2, onboarded)
       WHERE id = $3 RETURNING *`,
      [name ? name.trim() : null, onboarded ?? null, squadId]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating squad:', err.message);
    const status = err.status || 500;
    res.status(status).json({ error: status === 403 ? err.message : 'Server error' });
  }
});

module.exports = router;
