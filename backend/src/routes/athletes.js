const express = require('express');
const { Pool } = require('pg');
const { requireAuth, getAuth } = require('../middleware/auth');
const { getOwnedSquadId, getOwnedSquadIdForCoach } = require('./_squad');

const router = express.Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// List the logged-in coach's roster
router.get('/', requireAuth(), async (req, res) => {
  try {
    const { userId: clerkUserId } = getAuth(req);
    const squadId = await getOwnedSquadId(pool, clerkUserId);

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
    const squadId = await getOwnedSquadIdForCoach(pool, clerkUserId);

    const result = await pool.query(
      `INSERT INTO athletes (squad_id, name, position, squad_number, date_of_birth, contact_info)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [squadId, name.trim(), position || null, squad_number || null, date_of_birth || null, contact_info || null]
    );

res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating athlete:', err);
    const status = err.status || 500;
    const message = status === 403 ? err.message : 'Server error';
    res.status(status).json({ error: message });
  }
});

// GET /api/athletes/:id/stats — per-athlete summary derived from logged events (US17)
// NOTE: "appearances" here = distinct events this athlete has a logged action in.
// There's no separate roster/lineup-per-event table yet, so an athlete who played
// but never had an action logged against them won't be counted as an appearance.
router.get('/:id/stats', requireAuth(), async (req, res) => {
  try {
    const { userId: clerkUserId } = getAuth(req);
    const squadId = await getOwnedSquadId(pool, clerkUserId);

    const athleteResult = await pool.query(
      'SELECT * FROM athletes WHERE id = $1 AND squad_id = $2',
      [req.params.id, squadId]
    );
    if (athleteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Athlete not found' });
    }

    const logsResult = await pool.query(
      `SELECT l.*, e.event_date, e.opponent
       FROM log_entries l
       JOIN events e ON e.id = l.event_id
       WHERE l.athlete_id = $1 AND l.deleted_at IS NULL
       ORDER BY e.event_date DESC`,
      [req.params.id]
    );
    const logs = logsResult.rows;

    const goals = logs
      .filter((l) => l.action_type === 'goal')
      .reduce((sum, l) => sum + l.value, 0);
    const assists = logs
      .filter((l) => l.action_type === 'assist')
      .reduce((sum, l) => sum + l.value, 0);
    const penalties = logs.filter((l) => l.action_type.includes('penalty')).length;
    const yellowCards = logs.filter((l) => l.action_type === 'yellow_card').length;
    const redCards = logs.filter((l) => l.action_type === 'red_card').length;
    const appearances = new Set(logs.map((l) => l.event_id)).size;

    res.json({
      athlete: athleteResult.rows[0],
      stats: { goals, assists, penalties, yellowCards, redCards, appearances },
      logs,
    });
  } catch (err) {
    console.error('Error fetching athlete stats:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// Edit an athlete — only if the coach owns the squad it belongs to
router.patch('/:id', requireAuth(), async (req, res) => {
  try {
    const { userId: clerkUserId } = getAuth(req);
    const squadId = await getOwnedSquadIdForCoach(pool, clerkUserId);

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
    const status = err.status || 500;
    const message = status === 403 ? err.message : 'Server error';
    res.status(status).json({ error: message });
  }
});

// Remove an athlete — only if the coach owns the squad it belongs to
router.delete('/:id', requireAuth(), async (req, res) => {
  try {
    const { userId: clerkUserId } = getAuth(req);
    const squadId = await getOwnedSquadIdForCoach(pool, clerkUserId);

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
    const status = err.status || 500;
    const message = status === 403 ? err.message : 'Server error';
    res.status(status).json({ error: message });
  }
});

module.exports = router;
