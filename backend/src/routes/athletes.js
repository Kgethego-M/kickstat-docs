const express = require('express');
const { Pool } = require('pg');
const { requireAuth, getAuth } = require('../middleware/auth');

const router = express.Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Helper: get the squad_id owned by the logged-in coach, creating one if it doesn't exist yet
async function getOwnedSquadId(clerkUserId) {
  const userResult = await pool.query(
    'SELECT id FROM users WHERE clerk_id = $1',
    [clerkUserId]
  );

  if (userResult.rows.length === 0) {
    return null;
  }

  const userId = userResult.rows[0].id;

  let squadResult = await pool.query(
    'SELECT id FROM squads WHERE coach_id = $1',
    [userId]
  );

  if (squadResult.rows.length === 0) {
    try {
      squadResult = await pool.query(
        'INSERT INTO squads (coach_id, name) VALUES ($1, $2) RETURNING id',
        [userId, 'My Squad']
      );
    } catch (insertErr) {
      // If a concurrent request already created the squad (unique constraint violation),
      // fetch the existing one instead of failing
      if (insertErr.code === '23505') {
        squadResult = await pool.query(
          'SELECT id FROM squads WHERE coach_id = $1',
          [userId]
        );
      } else {
        throw insertErr;
      }
    }
  }

  return squadResult.rows[0].id;
}

// List the logged-in coach's roster
router.get('/', requireAuth(), async (req, res) => {
  try {
    const { userId: clerkUserId } = getAuth(req);
    const squadId = await getOwnedSquadId(clerkUserId);
    if (!squadId) {
      return res.json([]);
    }

    const result = await pool.query(
      'SELECT * FROM athletes WHERE squad_id = $1 ORDER BY name',
      [squadId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching athletes:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add an athlete to the logged-in coach's squad
router.post('/', requireAuth(), async (req, res) => {
  try {
    const { name, position, squad_number, date_of_birth, contact_info } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Athlete name is required' });
    }

    const { userId: clerkUserId } = getAuth(req);
    const squadId = await getOwnedSquadId(clerkUserId);
    if (!squadId) {
      return res.status(404).json({ error: 'Squad not found for this coach' });
    }

    const result = await pool.query(
      `INSERT INTO athletes (squad_id, name, position, squad_number, date_of_birth, contact_info)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [squadId, name.trim(), position || null, squad_number || null, date_of_birth || null, contact_info || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error adding athlete:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// Edit an athlete — only if the coach owns the squad it belongs to
router.patch('/:id', requireAuth(), async (req, res) => {
  try {
    const { userId: clerkUserId } = getAuth(req);
    const squadId = await getOwnedSquadId(clerkUserId);
    if (!squadId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const athleteCheck = await pool.query(
      'SELECT id FROM athletes WHERE id = $1 AND squad_id = $2',
      [req.params.id, squadId]
    );
    if (athleteCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized to edit this athlete' });
    }

    const { name, position, squad_number, date_of_birth, contact_info } = req.body;

    const result = await pool.query(
      `UPDATE athletes
       SET name = COALESCE($1, name),
           position = COALESCE($2, position),
           squad_number = COALESCE($3, squad_number),
           date_of_birth = COALESCE($4, date_of_birth),
           contact_info = COALESCE($5, contact_info),
           updated_at = now()
       WHERE id = $6 RETURNING *`,
      [name, position, squad_number, date_of_birth, contact_info, req.params.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating athlete:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// Remove an athlete — only if the coach owns the squad it belongs to
router.delete('/:id', requireAuth(), async (req, res) => {
  try {
    const { userId: clerkUserId } = getAuth(req);
    const squadId = await getOwnedSquadId(clerkUserId);
    if (!squadId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const result = await pool.query(
      'DELETE FROM athletes WHERE id = $1 AND squad_id = $2 RETURNING id',
      [req.params.id, squadId]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized to delete this athlete' });
    }

    res.sendStatus(204);
  } catch (err) {
    console.error('Error deleting athlete:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
