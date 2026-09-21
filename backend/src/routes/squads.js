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

// POST /api/squads/mine/public-link — turn on (or rotate) the squad's
// public, unauthenticated share link. Anyone with the token can view the
// squad's roster and results via /api/public/squads/:token.
router.post('/mine/public-link', requireAuth(), async (req, res) => {
  try {
    const { userId: clerkUserId } = getAuth(req);
    const squadId = await getOwnedSquadId(pool, clerkUserId);

    const token = crypto.randomBytes(16).toString('hex');
    const result = await pool.query(
      `UPDATE squads SET public_token = $1, is_public = true WHERE id = $2 RETURNING *`,
      [token, squadId]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error creating public link:', err.message);
    const status = err.status || 500;
    res.status(status).json({ error: status === 403 ? err.message : 'Server error' });
  }
});

// DELETE /api/squads/mine/public-link — turn the public page back off. The
// token is kept (not wiped) so re-enabling later doesn't hand out a new URL.
router.delete('/mine/public-link', requireAuth(), async (req, res) => {
  try {
    const { userId: clerkUserId } = getAuth(req);
    const squadId = await getOwnedSquadId(pool, clerkUserId);

    const result = await pool.query(
      `UPDATE squads SET is_public = false WHERE id = $1 RETURNING *`,
      [squadId]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error disabling public link:', err.message);
    const status = err.status || 500;
    res.status(status).json({ error: status === 403 ? err.message : 'Server error' });
  }
});

module.exports = router;
