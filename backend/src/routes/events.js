const express = require('express');
const { Pool } = require('pg');
const { requireAuth, getAuth } = require('../middleware/auth');
const { getOwnedSquadId, getOrCreateUserId } = require('./_squad');

const router = express.Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const LEAGUE_FORMATS = new Set(['league', 'tournament']);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getEventTeams(pool, eventId, squadId = null) {
  const result = await pool.query(
    `SELECT et.*, s.name AS squad_name,
            ${squadId ? `CASE WHEN et.squad_id = $2 THEN true ELSE false END AS is_mine` : 'false AS is_mine'}
     FROM event_teams et
     JOIN squads s ON s.id = et.squad_id
     WHERE et.event_id = $1
     ORDER BY et.seed_order NULLS LAST, et.joined_at`,
    squadId ? [eventId, squadId] : [eventId]
  );
  return result.rows;
}

async function getEventFixtures(pool, eventId, squadId = null) {
  const result = await pool.query(
    `SELECT f.*,
            home.name AS home_squad_name,
            away.name AS away_squad_name,
            ${squadId ? `CASE WHEN f.home_squad_id = $2 THEN true ELSE false END AS is_home_mine,
            CASE WHEN f.away_squad_id = $2 THEN true ELSE false END AS is_away_mine` : 'false AS is_home_mine, false AS is_away_mine'}
     FROM fixtures f
     JOIN squads home ON home.id = f.home_squad_id
     JOIN squads away ON away.id = f.away_squad_id
     WHERE f.event_id = $1
     ORDER BY f.event_date NULLS LAST, f.id`,
    squadId ? [eventId, squadId] : [eventId]
  );
  return result.rows;
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

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

async function generateFixtures(pool, eventId) {
  const teams = await getEventTeams(pool, eventId);
  if (teams.length < 2) {
    throw new Error('At least two teams are required to generate a schedule');
  }

  // Each pair of teams plays twice: once at home, once away.
  const fixtures = [];
  for (let i = 0; i < teams.length; i++) {
    for (let j = 0; j < teams.length; j++) {
      if (i === j) continue;
      fixtures.push({
        home_squad_id: teams[i].squad_id,
        away_squad_id: teams[j].squad_id,
      });
    }
  }

  shuffle(fixtures);

  const created = [];
  for (const fixture of fixtures) {
    const result = await pool.query(
      `INSERT INTO fixtures (event_id, home_squad_id, away_squad_id)
       VALUES ($1, $2, $3) RETURNING *`,
      [eventId, fixture.home_squad_id, fixture.away_squad_id]
    );
    created.push(result.rows[0]);
  }

  await pool.query(
    "UPDATE events SET status = 'scheduled', updated_at = now() WHERE id = $1",
    [eventId]
  );

  return created;
}

async function computeStandings(pool, eventId) {
  const fixtures = await getEventFixtures(pool, eventId);
  const teams = await getEventTeams(pool, eventId);
  const teamMap = new Map(teams.map((t) => [t.squad_id, { ...t, played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, gd: 0, points: 0 }]));

  for (const fixture of fixtures) {
    if (fixture.status !== 'completed') continue;

    const logs = await getFixtureLogs(pool, fixture.id);
    const homeGoals = logs
      .filter((l) => l.is_scoring && l.athlete_id !== null)
      .reduce((sum, l) => sum + l.value, 0);
    const awayGoals = logs
      .filter((l) => l.is_scoring && l.athlete_id === null)
      .reduce((sum, l) => sum + l.value, 0);

    const home = teamMap.get(fixture.home_squad_id);
    const away = teamMap.get(fixture.away_squad_id);
    if (!home || !away) continue;

    home.played++;
    away.played++;
    home.gf += homeGoals;
    home.ga += awayGoals;
    away.gf += awayGoals;
    away.ga += homeGoals;

    if (homeGoals > awayGoals) {
      home.wins++;
      home.points += 3;
      away.losses++;
    } else if (awayGoals > homeGoals) {
      away.wins++;
      away.points += 3;
      home.losses++;
    } else {
      home.draws++;
      away.draws++;
      home.points++;
      away.points++;
    }
  }

  const standings = Array.from(teamMap.values()).map((t) => ({
    squadId: t.squad_id,
    squadName: t.squad_name,
    played: t.played,
    wins: t.wins,
    draws: t.draws,
    losses: t.losses,
    gf: t.gf,
    ga: t.ga,
    gd: t.gf - t.ga,
    points: t.points,
  }));

  // Standard football ordering: points, then goal difference, then goals for.
  standings.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.gd !== a.gd) return b.gd - a.gd;
    return b.gf - a.gf;
  });

  return standings;
}

async function computeTopStats(pool, eventId) {
  const result = await pool.query(
    `SELECT l.athlete_id, a.name AS athlete_name, s.id AS squad_id, s.name AS squad_name,
            SUM(CASE WHEN l.action_type = 'goal' THEN l.value ELSE 0 END) AS goals,
            SUM(CASE WHEN l.action_type = 'assist' THEN l.value ELSE 0 END) AS assists
     FROM log_entries l
     JOIN fixtures f ON f.id = l.fixture_id
     JOIN athletes a ON a.id = l.athlete_id
     JOIN squads s ON s.id = a.squad_id
     WHERE f.event_id = $1 AND l.deleted_at IS NULL
     GROUP BY l.athlete_id, a.name, s.id, s.name
     ORDER BY goals DESC, assists DESC`,
    [eventId]
  );

  const rows = result.rows.map((r) => ({
    athleteId: r.athlete_id,
    athleteName: r.athlete_name,
    squadId: r.squad_id,
    squadName: r.squad_name,
    goals: Number(r.goals),
    assists: Number(r.assists),
  }));

  return {
    topScorers: rows.filter((r) => r.goals > 0),
    topAssisters: rows.filter((r) => r.assists > 0).sort((a, b) => b.assists - a.assists),
  };
}

async function loadEventWithAccess(pool, eventId, squadId) {
  const eventResult = await pool.query(
    `SELECT e.*
     FROM events e
     LEFT JOIN event_teams et ON et.event_id = e.id AND et.squad_id = $2
     WHERE e.id = $1 AND (e.squad_id = $2 OR et.squad_id IS NOT NULL)`,
    [eventId, squadId]
  );
  return eventResult.rows[0] || null;
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// GET /api/events — list events the logged-in coach's squad participates in
router.get('/', requireAuth(), async (req, res) => {
  try {
    const { userId: clerkUserId } = getAuth(req);
    const squadId = await getOwnedSquadId(pool, clerkUserId);

    const result = await pool.query(
      `SELECT e.*,
              (SELECT COUNT(*) FROM event_teams et WHERE et.event_id = e.id) AS team_count
       FROM events e
       LEFT JOIN event_teams et ON et.event_id = e.id AND et.squad_id = $1
       WHERE e.squad_id = $1 OR et.squad_id IS NOT NULL
       ORDER BY e.event_date DESC`,
      [squadId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching events:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/events — schedule a new event or create a league/tournament
router.post('/', requireAuth(), async (req, res) => {
  try {
    const {
      title,
      opponent,
      event_type,
      type,
      event_date,
      event_time,
      location,
      duration_minutes,
      format,
      required_teams,
    } = req.body;

    if (!event_date) {
      return res.status(400).json({ error: 'event_date is required' });
    }

    const eventFormat = format || 'match';
    if (!['match', 'training', 'league', 'tournament'].includes(eventFormat)) {
      return res.status(400).json({ error: 'Invalid event format' });
    }

    const isLeague = LEAGUE_FORMATS.has(eventFormat);
    if (isLeague) {
      const teamCount = Number(required_teams);
      if (!teamCount || teamCount < 2) {
        return res.status(400).json({ error: 'required_teams must be at least 2 for league/tournament events' });
      }
    }

    const timestamp = event_time ? `${event_date}T${event_time}` : event_date;

    const { userId: clerkUserId } = getAuth(req);
    const userId = await getOrCreateUserId(pool, clerkUserId);
    const squadId = await getOwnedSquadId(pool, clerkUserId);

    const result = await pool.query(
      `INSERT INTO events (squad_id, title, opponent, event_type, format, required_teams, event_date, location, duration_minutes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        squadId,
        title ? title.trim() : null,
        opponent ? opponent.trim() : null,
        type || event_type || 'match',
        eventFormat,
        isLeague ? Number(required_teams) : null,
        timestamp,
        location ? location.trim() : null,
        duration_minutes ? Number(duration_minutes) : 90,
        userId,
      ]
    );

    const event = result.rows[0];

    if (isLeague) {
      await pool.query(
        `INSERT INTO event_teams (event_id, squad_id, role, seed_order)
         VALUES ($1, $2, 'participant', 1)`,
        [event.id, squadId]
      );
      event.status = 'open';
      await pool.query(
        "UPDATE events SET status = 'open' WHERE id = $1",
        [event.id]
      );
      event.team_count = 1;
    }

    res.status(201).json(event);
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

    const event = await loadEventWithAccess(pool, req.params.id, squadId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (LEAGUE_FORMATS.has(event.format)) {
      const teams = await getEventTeams(pool, event.id, squadId);
      const fixtures = await getEventFixtures(pool, event.id, squadId);
      const standings = await computeStandings(pool, event.id);
      const stats = await computeTopStats(pool, event.id);

      return res.json({
        event,
        teams,
        fixtures,
        standings,
        stats,
      });
    }

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

// POST /api/events/:id/join — join an open league/tournament
router.post('/:id/join', requireAuth(), async (req, res) => {
  try {
    const { userId: clerkUserId } = getAuth(req);
    const squadId = await getOwnedSquadId(pool, clerkUserId);

    const eventResult = await pool.query('SELECT * FROM events WHERE id = $1', [req.params.id]);
    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    const event = eventResult.rows[0];

    if (!LEAGUE_FORMATS.has(event.format)) {
      return res.status(400).json({ error: 'Only league or tournament events can be joined' });
    }
    if (event.status !== 'open') {
      return res.status(400).json({ error: 'Event is not open for joining' });
    }

    const existing = await pool.query(
      'SELECT id FROM event_teams WHERE event_id = $1 AND squad_id = $2',
      [event.id, squadId]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Squad already joined this event' });
    }

    const countResult = await pool.query(
      'SELECT COUNT(*) AS count FROM event_teams WHERE event_id = $1',
      [event.id]
    );
    const currentCount = Number(countResult.rows[0].count);
    if (currentCount >= event.required_teams) {
      return res.status(400).json({ error: 'Event is already full' });
    }

    await pool.query(
      `INSERT INTO event_teams (event_id, squad_id, role, seed_order)
       VALUES ($1, $2, 'participant', $3)`,
      [event.id, squadId, currentCount + 1]
    );

    const newCount = currentCount + 1;
    if (newCount >= event.required_teams) {
      await pool.query(
        "UPDATE events SET status = 'full', updated_at = now() WHERE id = $1",
        [event.id]
      );
      await generateFixtures(pool, event.id);
    }

    res.json({ joined: true, team_count: newCount, required_teams: event.required_teams });
  } catch (err) {
    console.error('Error joining event:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/events/:id/teams
router.get('/:id/teams', requireAuth(), async (req, res) => {
  try {
    const { userId: clerkUserId } = getAuth(req);
    const squadId = await getOwnedSquadId(pool, clerkUserId);

    const event = await loadEventWithAccess(pool, req.params.id, squadId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const teams = await getEventTeams(pool, event.id);
    res.json(teams);
  } catch (err) {
    console.error('Error fetching event teams:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/events/:id/fixtures
router.get('/:id/fixtures', requireAuth(), async (req, res) => {
  try {
    const { userId: clerkUserId } = getAuth(req);
    const squadId = await getOwnedSquadId(pool, clerkUserId);

    const event = await loadEventWithAccess(pool, req.params.id, squadId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const fixtures = await getEventFixtures(pool, event.id);
    res.json(fixtures);
  } catch (err) {
    console.error('Error fetching fixtures:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/events/:id/standings
router.get('/:id/standings', requireAuth(), async (req, res) => {
  try {
    const { userId: clerkUserId } = getAuth(req);
    const squadId = await getOwnedSquadId(pool, clerkUserId);

    const event = await loadEventWithAccess(pool, req.params.id, squadId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (!LEAGUE_FORMATS.has(event.format)) {
      return res.status(400).json({ error: 'Standings are only available for league/tournament events' });
    }

    const standings = await computeStandings(pool, event.id);
    res.json(standings);
  } catch (err) {
    console.error('Error fetching standings:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/events/:id/stats
router.get('/:id/stats', requireAuth(), async (req, res) => {
  try {
    const { userId: clerkUserId } = getAuth(req);
    const squadId = await getOwnedSquadId(pool, clerkUserId);

    const event = await loadEventWithAccess(pool, req.params.id, squadId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (!LEAGUE_FORMATS.has(event.format)) {
      return res.status(400).json({ error: 'Stats are only available for league/tournament events' });
    }

    const stats = await computeTopStats(pool, event.id);
    res.json(stats);
  } catch (err) {
    console.error('Error fetching event stats:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// ---- Log entries, nested under an event — US13, US14, US16 ----

// GET /api/events/:id/logs — active log entries in order (live dashboard timeline)
router.get('/:id/logs', requireAuth(), async (req, res) => {
  try {
    const { userId: clerkUserId } = getAuth(req);
    const squadId = await getOwnedSquadId(pool, clerkUserId);

    const event = await loadEventWithAccess(pool, req.params.id, squadId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const result = await pool.query(
      `SELECT l.*, a.name AS athlete_name
       FROM log_entries l
       LEFT JOIN athletes a ON a.id = l.athlete_id
       WHERE l.event_id = $1 AND l.fixture_id IS NULL AND l.deleted_at IS NULL
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

    const event = await loadEventWithAccess(pool, req.params.id, squadId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (LEAGUE_FORMATS.has(event.format)) {
      return res.status(400).json({ error: 'Use fixture endpoints to log league/tournament actions' });
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
       WHERE l.id = $1 AND l.event_id = $2 AND e.squad_id = $3 AND l.deleted_at IS NULL AND l.fixture_id IS NULL`,
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
         AND e.squad_id = $3 AND l.deleted_at IS NULL AND l.fixture_id IS NULL
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
