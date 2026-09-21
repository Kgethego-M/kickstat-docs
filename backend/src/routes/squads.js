const express = require('express');
const crypto = require('crypto');
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

// PATCH /api/squads/mine — rename the squad, mark onboarding complete,
// and/or toggle public page visibility
router.patch('/mine', requireAuth(), async (req, res) => {
  try {
    const { name, onboarded, is_public } = req.body;

    if (name !== undefined && !name.trim()) {
      return res.status(400).json({ error: 'Squad name cannot be empty' });
    }

    const { userId: clerkUserId } = getAuth(req);
    const squadId = await getOwnedSquadId(pool, clerkUserId);

    // Only relevant when turning public ON. If the squad already has a
    // token (e.g. was public before and got turned off), we keep it so the
    // same link keeps working rather than silently breaking a link someone
    // was already given out. The COALESCE below only uses this value when
    // public_token is currently NULL.
    const candidateToken = is_public === true ? crypto.randomBytes(24).toString('hex') : null;

    const result = await pool.query(
      `UPDATE squads
       SET name = COALESCE($1, name),
           onboarded = COALESCE($2, onboarded),
           is_public = COALESCE($3, is_public),
           public_token = CASE
             WHEN $3 = true THEN COALESCE(public_token, $5)
             ELSE public_token
           END
       WHERE id = $4 RETURNING *`,
      [name ? name.trim() : null, onboarded ?? null, is_public ?? null, squadId, candidateToken]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating squad:', err.message);
    const status = err.status || 500;
    res.status(status).json({ error: status === 403 ? err.message : 'Server error' });
  }
});

module.exports = router;