const express = require('express');
const { Pool } = require('pg');
const { requireAuth, getAuth } = require('../middleware/auth');
const { getOwnedSquadId, getOrCreateUserId } = require('./_squad');

const router = express.Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// GET /api/events — list the logged-in coach's events
router.get('/', requireAuth(), async (req, res) => {
  try {
    const { userId: clerkUserId } = getAuth(req);
    const squadId = await getOwnedSquadId(pool, clerkUserId);

    const result = await pool.query(
      'SELECT * FROM events WHERE squad_id = $1 ORDER BY event_date DESC',
      [squadId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching events:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/events — schedule a new event
// Accepts either shape:
//   { opponent, event_type, event_date }                     (matchday form)
//   { title, type, event_date, event_time, location }        (calendar form)
// or any mix of the two — everything except event_date is optional.
router.post('/', requireAuth(), async (req, res) => {
  try {
    const { title, opponent, event_type, type, event_date, event_time, location, duration_minutes } = req.body;

    if (!event_date) {
      return res.status(400).json({ error: 'event_date is required' });
    }

    // If a separate event_time was sent (calendar form), combine it with event_date
    // into one timestamp — the events table only has a single event_date column.
    const timestamp = event_time ? `${event_date}T${event_time}` : event_date;

    const { userId: clerkUserId } = getAuth(req);
    const userId = await getOrCreateUserId(pool, clerkUserId);
    const squadId = await getOwnedSquadId(pool, clerkUserId);

    const result = await pool.query(
      `INSERT INTO events (squad_id, title, opponent, event_type, event_date, location, duration_minutes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        squadId,
        title ? title.trim() : null,
        opponent ? opponent.trim() : null,
        type || event_type || 'match',
        timestamp,
        location ? location.trim() : null,
        duration_minutes ? Number(duration_minutes) : 90,
        userId,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating event:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/events/:id — event detail: aggregated result + full timeline (US15)
router.get('/:id', requireAuth(), async (req, res) => {
  try {
    const { userId: clerkUserId } = getAuth(req);
    const squadId = await getOwnedSquadId(pool, clerkUserId);

    const eventResult = await pool.query(
      'SELECT * FROM events WHERE id = $1 AND squad_id = $2',
      [req.params.id, squadId]
    );
    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    const event = eventResult.rows[0];

    const timelineResult = await pool.query(
      `SELECT l.*, a.name AS athlete_name
       FROM log_entries l
       LEFT JOIN athletes a ON a.id = l.athlete_id
       WHERE l.event_id = $1 AND l.deleted_at IS NULL
       ORDER BY l.minute NULLS LAST, l.logged_at`,
      [req.params.id]
    );
    const timeline = timelineResult.rows;

    const squadScore = timeline
      .filter((l) => l.is_scoring && l.athlete_id !== null)
      .reduce((sum, l) => sum + l.value, 0);
    const opponentScore = timeline
      .filter((l) => l.is_scoring && l.athlete_id === null)
      .reduce((sum, l) => sum + l.value, 0);
    const penalties = timeline.filter(
      (l) => l.action_type.includes('penalty') || l.action_type.includes('card')
    );

    res.json({
      event,
      result: { squad: squadScore, opponent: opponentScore },
      penalties,
      timeline,
    });
  } catch (err) {
    console.error('Error fetching event detail:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/events/:id — update event (title, opponent, type, date, location, status)
router.patch('/:id', requireAuth(), async (req, res) => {
  try {
    const { userId: clerkUserId } = getAuth(req);
    const squadId = await getOwnedSquadId(pool, clerkUserId);

    const check = await pool.query(
      'SELECT id FROM events WHERE id = $1 AND squad_id = $2',
      [req.params.id, squadId]
    );
    if (check.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized to edit this event' });
    }

    const { title, opponent, event_type, type, event_date, event_time, location, status, duration_minutes } = req.body;
    const timestamp = event_date ? (event_time ? `${event_date}T${event_time}` : event_date) : null;

    const result = await pool.query(
      `UPDATE events
       SET title = COALESCE($1, title),
           opponent = COALESCE($2, opponent),
           event_type = COALESCE($3, event_type),
           event_date = COALESCE($4, event_date),
           location = COALESCE($5, location),
           status = COALESCE($6, status),
           duration_minutes = COALESCE($7, duration_minutes),
           updated_at = now()
       WHERE id = $8 RETURNING *`,
      [title, opponent, type || event_type || null, timestamp, location, status, duration_minutes ? Number(duration_minutes) : null, req.params.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating event:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/events/:id/cancel — quick shortcut to mark an event cancelled
router.patch('/:id/cancel', requireAuth(), async (req, res) => {
  try {
    const { userId: clerkUserId } = getAuth(req);
    const squadId = await getOwnedSquadId(pool, clerkUserId);

    const result = await pool.query(
      `UPDATE events SET status = 'cancelled', updated_at = now() WHERE id = $1 AND squad_id = $2 RETURNING *`,
      [req.params.id, squadId]
    );
    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error cancelling event:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// ---- Log entries, nested under an event — US13, US14, US16 ----

// GET /api/events/:id/logs — active log entries in order (live dashboard timeline)
router.get('/:id/logs', requireAuth(), async (req, res) => {
  try {
    const { userId: clerkUserId } = getAuth(req);
    const squadId = await getOwnedSquadId(pool, clerkUserId);

    const eventCheck = await pool.query(
      'SELECT id FROM events WHERE id = $1 AND squad_id = $2',
      [req.params.id, squadId]
    );
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const result = await pool.query(
      `SELECT l.*, a.name AS athlete_name
       FROM log_entries l
       LEFT JOIN athletes a ON a.id = l.athlete_id
       WHERE l.event_id = $1 AND l.deleted_at IS NULL
       ORDER BY l.minute NULLS LAST, l.logged_at`,
      [req.params.id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching log entries:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/events/:id/logs — log a scoring moment / action against an athlete (US13)
router.post('/:id/logs', requireAuth(), async (req, res) => {
  try {
    const { athlete_id, action_type, is_scoring, value, minute, notes } = req.body;

    if (!action_type || !action_type.trim()) {
      return res.status(400).json({ error: 'action_type is required' });
    }

    const { userId: clerkUserId } = getAuth(req);
    const userId = await getOrCreateUserId(pool, clerkUserId);
    const squadId = await getOwnedSquadId(pool, clerkUserId);

    const eventCheck = await pool.query(
      'SELECT id FROM events WHERE id = $1 AND squad_id = $2',
      [req.params.id, squadId]
    );
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (athlete_id) {
      const athleteCheck = await pool.query(
        'SELECT id FROM athletes WHERE id = $1 AND squad_id = $2',
        [athlete_id, squadId]
      );
      if (athleteCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Athlete does not belong to this squad' });
      }
    }

    const result = await pool.query(
      `INSERT INTO log_entries (event_id, athlete_id, action_type, is_scoring, value, minute, notes, logged_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        req.params.id,
        athlete_id || null,
        action_type.trim(),
        !!is_scoring,
        value ?? 1,
        minute ?? null,
        notes || null,
        userId,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating log entry:', err);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// PATCH /api/events/:id/logs/:logId — edit a log entry just made (US14)
router.patch('/:id/logs/:logId', requireAuth(), async (req, res) => {
  try {
    const { userId: clerkUserId } = getAuth(req);
    const squadId = await getOwnedSquadId(pool, clerkUserId);

    const check = await pool.query(
      `SELECT l.id FROM log_entries l
       JOIN events e ON e.id = l.event_id
       WHERE l.id = $1 AND l.event_id = $2 AND e.squad_id = $3 AND l.deleted_at IS NULL`,
      [req.params.logId, req.params.id, squadId]
    );
    if (check.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized to edit this log entry' });
    }

    const { athlete_id, action_type, is_scoring, value, minute, notes } = req.body;

    const result = await pool.query(
      `UPDATE log_entries
       SET athlete_id = COALESCE($1, athlete_id),
           action_type = COALESCE($2, action_type),
           is_scoring = COALESCE($3, is_scoring),
           value = COALESCE($4, value),
           minute = COALESCE($5, minute),
           notes = COALESCE($6, notes),
           updated_at = now()
       WHERE id = $7 RETURNING *`,
      [athlete_id, action_type, is_scoring, value, minute, notes, req.params.logId]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating log entry:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/events/:id/logs/:logId — undo a log entry (soft delete, US14)
router.delete('/:id/logs/:logId', requireAuth(), async (req, res) => {
  try {
    const { userId: clerkUserId } = getAuth(req);
    const squadId = await getOwnedSquadId(pool, clerkUserId);

    const result = await pool.query(
      `UPDATE log_entries l
       SET deleted_at = now()
       FROM events e
       WHERE l.id = $1 AND l.event_id = $2 AND l.event_id = e.id
         AND e.squad_id = $3 AND l.deleted_at IS NULL
       RETURNING l.id`,
      [req.params.logId, req.params.id, squadId]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized to undo this log entry' });
    }

    res.sendStatus(204);
  } catch (err) {
    console.error('Error undoing log entry:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
