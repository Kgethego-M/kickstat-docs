const express = require('express');
const pool = require('../db');
const { requireAuth, getAuth } = require('../middleware/auth');
const { getOwnedSquadId, getOrCreateUserId } = require('./_squad');

const router = express.Router();

async function getFixtureWithAccess(pool, fixtureId, squadId) {
  const result = await pool.query(
    `SELECT f.*, e.format AS event_format, e.required_teams,
            home.name AS home_squad_name,
            away.name AS away_squad_name
     FROM fixtures f
     JOIN events e ON e.id = f.event_id
     JOIN event_teams et ON et.event_id = f.event_id AND et.squad_id = $2
     JOIN squads home ON home.id = f.home_squad_id
     JOIN squads away ON away.id = f.away_squad_id
     WHERE f.id = $1`,
    [fixtureId, squadId]
  );
  return result.rows[0] || null;
}

async function getFixtureLogs(pool, fixtureId) {
  const result = await pool.query(
    `SELECT l.*, a.name AS athlete_name
     FROM log_entries l
     LEFT JOIN athletes a ON a.id = l.athlete_id
     WHERE l.fixture_id = $1 AND l.deleted_at IS NULL
     ORDER BY l.minute NULLS LAST, l.logged_at`,
    [fixtureId]
  );
  return result.rows;
}

// GET /api/fixtures/:id — fixture detail + live timeline
router.get('/:id', requireAuth(), async (req, res) => {
  try {
    const { userId: clerkUserId } = getAuth(req);
    const squadId = await getOwnedSquadId(pool, clerkUserId);

    const fixture = await getFixtureWithAccess(pool, req.params.id, squadId);
    if (!fixture) {
      return res.status(404).json({ error: 'Fixture not found' });
    }

    const logs = await getFixtureLogs(pool, fixture.id);
    const homeScore = logs
      .filter((l) => l.is_scoring && l.athlete_id !== null)
      .reduce((sum, l) => sum + l.value, 0);
    const awayScore = logs
      .filter((l) => l.is_scoring && l.athlete_id === null)
      .reduce((sum, l) => sum + l.value, 0);

    res.json({
      fixture,
      result: { home: homeScore, away: awayScore },
      timeline: logs,
      canLog: fixture.home_squad_id === squadId,
    });
  } catch (err) {
    console.error('Error fetching fixture:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/fixtures/:id — update fixture status or kickoff time
router.patch('/:id', requireAuth(), async (req, res) => {
  try {
    const { userId: clerkUserId } = getAuth(req);
    const squadId = await getOwnedSquadId(pool, clerkUserId);

    const fixture = await getFixtureWithAccess(pool, req.params.id, squadId);
    if (!fixture) {
      return res.status(404).json({ error: 'Fixture not found' });
    }

    // Only the home team can drive the fixture status for now.
    if (fixture.home_squad_id !== squadId) {
      return res.status(403).json({ error: 'Only the home team can update this fixture' });
    }

    const { event_date, status } = req.body;
    const result = await pool.query(
      `UPDATE fixtures
       SET event_date = COALESCE($1, event_date),
           status = COALESCE($2, status),
           started_at = CASE WHEN $2 = 'live' THEN COALESCE(started_at, now()) ELSE started_at END,
           updated_at = now()
       WHERE id = $3 RETURNING *`,
      [event_date || null, status || null, req.params.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating fixture:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/fixtures/:id/logs
router.get('/:id/logs', requireAuth(), async (req, res) => {
  try {
    const { userId: clerkUserId } = getAuth(req);
    const squadId = await getOwnedSquadId(pool, clerkUserId);

    const fixture = await getFixtureWithAccess(pool, req.params.id, squadId);
    if (!fixture) {
      return res.status(404).json({ error: 'Fixture not found' });
    }

    const logs = await getFixtureLogs(pool, fixture.id);
    res.json(logs);
  } catch (err) {
    console.error('Error fetching fixture logs:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/fixtures/:id/logs — log an action in a league/tournament fixture
router.post('/:id/logs', requireAuth(), async (req, res) => {
  try {
    const { athlete_id, action_type, is_scoring, value, minute, notes } = req.body;

    if (!action_type || !action_type.trim()) {
      return res.status(400).json({ error: 'action_type is required' });
    }

    const { userId: clerkUserId } = getAuth(req);
    const userId = await getOrCreateUserId(pool, clerkUserId);
    const squadId = await getOwnedSquadId(pool, clerkUserId);

    const fixture = await getFixtureWithAccess(pool, req.params.id, squadId);
    if (!fixture) {
      return res.status(404).json({ error: 'Fixture not found' });
    }

    if (fixture.status === 'cancelled') {
      return res.status(400).json({ error: 'Fixture is cancelled' });
    }

    // Only the home team logs actions in a fixture.
    if (fixture.home_squad_id !== squadId) {
      return res.status(403).json({ error: 'Only the home team can log actions' });
    }

    // Same rule as events: no logging before the scheduled kickoff; a log
    // after kickoff starts the fixture automatically.
    if (fixture.status === 'scheduled') {
      if (fixture.event_date && new Date(fixture.event_date).getTime() > Date.now()) {
        return res.status(400).json({ error: 'This fixture has not started yet' });
      }
      await pool.query(
        "UPDATE fixtures SET status = 'live', started_at = COALESCE(started_at, now()), updated_at = now() WHERE id = $1",
        [fixture.id]
      );
      fixture.status = 'live';
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
      `INSERT INTO log_entries (event_id, fixture_id, athlete_id, action_type, is_scoring, value, minute, notes, logged_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        fixture.event_id,
        fixture.id,
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
    console.error('Error creating fixture log entry:', err);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// PATCH /api/fixtures/:id/logs/:logId
router.patch('/:id/logs/:logId', requireAuth(), async (req, res) => {
  try {
    const { userId: clerkUserId } = getAuth(req);
    const squadId = await getOwnedSquadId(pool, clerkUserId);

    const fixture = await getFixtureWithAccess(pool, req.params.id, squadId);
    if (!fixture) {
      return res.status(404).json({ error: 'Fixture not found' });
    }

    if (fixture.home_squad_id !== squadId) {
      return res.status(403).json({ error: 'Only the home team can edit logs' });
    }

    const check = await pool.query(
      `SELECT id FROM log_entries
       WHERE id = $1 AND fixture_id = $2 AND deleted_at IS NULL`,
      [req.params.logId, req.params.id]
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
    console.error('Error updating fixture log entry:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/fixtures/:id/logs/:logId
router.delete('/:id/logs/:logId', requireAuth(), async (req, res) => {
  try {
    const { userId: clerkUserId } = getAuth(req);
    const squadId = await getOwnedSquadId(pool, clerkUserId);

    const fixture = await getFixtureWithAccess(pool, req.params.id, squadId);
    if (!fixture) {
      return res.status(404).json({ error: 'Fixture not found' });
    }

    if (fixture.home_squad_id !== squadId) {
      return res.status(403).json({ error: 'Only the home team can undo logs' });
    }

    const result = await pool.query(
      `UPDATE log_entries
       SET deleted_at = now()
       WHERE id = $1 AND fixture_id = $2 AND deleted_at IS NULL
       RETURNING id`,
      [req.params.logId, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized to undo this log entry' });
    }

    res.sendStatus(204);
  } catch (err) {
    console.error('Error undoing fixture log entry:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
