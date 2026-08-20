const express = require('express');
const { Pool } = require('pg');
const { requireAuth, getAuth } = require('../middleware/auth');

const router = express.Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function getOwnedSquadId(clerkUserId) {
  const userResult = await pool.query('SELECT id FROM users WHERE clerk_id = $1', [clerkUserId]);
  if (userResult.rows.length === 0) return null;
  const userId = userResult.rows[0].id;
  let squadResult = await pool.query('SELECT id FROM squads WHERE coach_id = $1', [userId]);
  if (squadResult.rows.length === 0) {
    squadResult = await pool.query('INSERT INTO squads (coach_id, name) VALUES ($1, $2) RETURNING id', [userId, 'My Squad']);
  }
  return squadResult.rows[0].id;
}

const EVENT_COLUMNS = `id, squad_id, type, title, TO_CHAR(event_date, 'YYYY-MM-DD') AS event_date, event_time, location, status, created_at, updated_at`;

router.get('/', requireAuth(), async (req, res) => {
  try {
    const { userId: clerkUserId } = getAuth(req);
    const squadId = await getOwnedSquadId(clerkUserId);
    if (!squadId) return res.json([]);
    const result = await pool.query(
      `SELECT ${EVENT_COLUMNS} FROM events WHERE squad_id = $1 ORDER BY event_date, event_time`,
      [squadId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', requireAuth(), async (req, res) => {
  try {
    const { type, title, event_date, event_time, location } = req.body;
    if (!type || !title || !event_date || !event_time || !location) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    const { userId: clerkUserId } = getAuth(req);
    const squadId = await getOwnedSquadId(clerkUserId);
    if (!squadId) return res.status(404).json({ error: 'Squad not found' });
    const result = await pool.query(
      `INSERT INTO events (squad_id, type, title, event_date, event_time, location) VALUES ($1,$2,$3,$4,$5,$6) RETURNING ${EVENT_COLUMNS}`,
      [squadId, type, title.trim(), event_date, event_time, location.trim()]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/:id', requireAuth(), async (req, res) => {
  try {
    const { userId: clerkUserId } = getAuth(req);
    const squadId = await getOwnedSquadId(clerkUserId);
    if (!squadId) return res.status(403).json({ error: 'Not authorized' });
    const check = await pool.query('SELECT id FROM events WHERE id = $1 AND squad_id = $2', [req.params.id, squadId]);
    if (check.rows.length === 0) return res.status(403).json({ error: 'Not authorized' });
    const { type, title, event_date, event_time, location } = req.body;
    const result = await pool.query(
      `UPDATE events SET type=COALESCE($1,type), title=COALESCE($2,title), event_date=COALESCE($3,event_date), event_time=COALESCE($4,event_time), location=COALESCE($5,location), updated_at=now() WHERE id=$6 RETURNING ${EVENT_COLUMNS}`,
      [type, title, event_date, event_time, location, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/:id/cancel', requireAuth(), async (req, res) => {
  try {
    const { userId: clerkUserId } = getAuth(req);
    const squadId = await getOwnedSquadId(clerkUserId);
    if (!squadId) return res.status(403).json({ error: 'Not authorized' });
    const result = await pool.query(
      `UPDATE events SET status='cancelled', updated_at=now() WHERE id=$1 AND squad_id=$2 RETURNING ${EVENT_COLUMNS}`,
      [req.params.id, squadId]
    );
    if (result.rows.length === 0) return res.status(403).json({ error: 'Not authorized' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;