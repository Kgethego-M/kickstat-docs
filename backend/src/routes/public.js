const express = require('express');
const pool = require('../db');

const router = express.Router();

// This router is intentionally mounted with no auth middleware — the
// public_token in the URL *is* the access control. A coach opts in by
// calling POST /api/squads/mine/public-link, which sets is_public = true.

async function loadPublicSquad(token) {
  const squadResult = await pool.query(
    `SELECT id, name, public_token FROM squads WHERE public_token = $1 AND is_public = true`,
    [token]
  );
  return squadResult.rows[0] || null;
}

// Builds the roster + stats payload shared by the JSON page and the CSV
// export, so the two can never drift out of sync with each other.
async function buildRosterReport(squadId) {
  const athletesResult = await pool.query(
    `SELECT id, name, position, squad_number FROM athletes WHERE squad_id = $1 ORDER BY name`,
    [squadId]
  );

  const statsResult = await pool.query(
    `SELECT a.id AS athlete_id,
            COUNT(DISTINCT l.event_id) FILTER (WHERE l.deleted_at IS NULL) AS appearances,
            COALESCE(SUM(l.value) FILTER (WHERE l.action_type = 'goal' AND l.deleted_at IS NULL), 0) AS goals,
            COALESCE(SUM(l.value) FILTER (WHERE l.action_type = 'assist' AND l.deleted_at IS NULL), 0) AS assists,
            COUNT(*) FILTER (WHERE l.action_type = 'yellow_card' AND l.deleted_at IS NULL) AS yellow_cards,
            COUNT(*) FILTER (WHERE l.action_type = 'red_card' AND l.deleted_at IS NULL) AS red_cards
     FROM athletes a
     LEFT JOIN log_entries l ON l.athlete_id = a.id
     WHERE a.squad_id = $1
     GROUP BY a.id`,
    [squadId]
  );
  const statsByAthlete = new Map(statsResult.rows.map((r) => [r.athlete_id, r]));

  const resultsResult = await pool.query(
    `SELECT e.id, e.opponent, e.event_date,
            COALESCE(SUM(l.value) FILTER (WHERE l.is_scoring AND l.athlete_id IS NOT NULL AND l.deleted_at IS NULL), 0) AS squad_score,
            COALESCE(SUM(l.value) FILTER (WHERE l.is_scoring AND l.athlete_id IS NULL AND l.deleted_at IS NULL), 0) AS opponent_score
     FROM events e
     LEFT JOIN log_entries l ON l.event_id = e.id
     WHERE e.squad_id = $1 AND e.status = 'completed' AND e.format = 'match'
     GROUP BY e.id
     ORDER BY e.event_date DESC
     LIMIT 20`,
    [squadId]
  );

  const roster = athletesResult.rows.map((a) => {
    const s = statsByAthlete.get(a.id) || {};
    return {
      name: a.name,
      position: a.position,
      squadNumber: a.squad_number,
      appearances: Number(s.appearances || 0),
      goals: Number(s.goals || 0),
      assists: Number(s.assists || 0),
      yellowCards: Number(s.yellow_cards || 0),
      redCards: Number(s.red_cards || 0),
    };
  });

  const results = resultsResult.rows.map((r) => ({
    opponent: r.opponent,
    date: r.event_date,
    squadScore: Number(r.squad_score),
    opponentScore: Number(r.opponent_score),
  }));

  return { roster, results };
}

// GET /api/public/squads/:token — squad name + roster stats + recent
// results, for anyone with the link.
router.get('/squads/:token', async (req, res) => {
  try {
    const squad = await loadPublicSquad(req.params.token);
    if (!squad) {
      return res.status(404).json({ error: 'This link is not active' });
    }

    const { roster, results } = await buildRosterReport(squad.id);
    res.json({ squadName: squad.name, roster, results });
  } catch (err) {
    console.error('Error loading public squad page:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/public/squads/:token/export.csv — downloadable roster + stats
// report. Built by hand (no CSV library needed) since it's a handful of
// flat, already-safe-to-join columns.
router.get('/squads/:token/export.csv', async (req, res) => {
  try {
    const squad = await loadPublicSquad(req.params.token);
    if (!squad) {
      return res.status(404).json({ error: 'This link is not active' });
    }

    const { roster } = await buildRosterReport(squad.id);

    function csvEscape(value) {
      const str = String(value ?? '');
      return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
    }

    const header = ['Name', 'Position', 'Squad #', 'Appearances', 'Goals', 'Assists', 'Yellow cards', 'Red cards'];
    const rows = roster.map((a) => [
      a.name, a.position || '', a.squadNumber ?? '', a.appearances, a.goals, a.assists, a.yellowCards, a.redCards,
    ]);
    const csv = [header, ...rows].map((row) => row.map(csvEscape).join(',')).join('\r\n');

    const filename = `${squad.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-roster.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (err) {
    console.error('Error exporting squad CSV:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
