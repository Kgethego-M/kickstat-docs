const express = require('express');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// ---------------------------------------------------------------------------
// League allow-list — protects rate limits on the free tier (10 req/min)
// ---------------------------------------------------------------------------
const ALLOWED_LEAGUES = {
  PL:  'Premier League',
  PD:  'La Liga',
  BL1: 'Bundesliga',
  SA:  'Serie A',
  FL1: 'Ligue 1',
  CL:  'UEFA Champions League',
};

// ---------------------------------------------------------------------------
// Simple in-memory cache — entries expire after 5 minutes
// ---------------------------------------------------------------------------
const cache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCached(key, data) {
  cache.set(key, { ts: Date.now(), data });
}

// ---------------------------------------------------------------------------
// Shared fetch helper
// ---------------------------------------------------------------------------
async function footballDataFetch(path) {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    const err = new Error('External API not configured');
    err.status = 503;
    throw err;
  }

  const url = `https://api.football-data.org/v4${path}`;
  let res;
  try {
    res = await fetch(url, {
      headers: { 'X-Auth-Token': apiKey },
    });
  } catch {
    const err = new Error('External API unreachable');
    err.status = 503;
    throw err;
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.message || `Upstream error ${res.status}`);
    err.status = res.status >= 500 ? 503 : res.status;
    throw err;
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// GET /api/external/fixtures?league=PL
// ---------------------------------------------------------------------------
router.get('/fixtures', requireAuth(), async (req, res) => {
  const league = (req.query.league || '').toUpperCase();

  if (!ALLOWED_LEAGUES[league]) {
    return res.status(400).json({
      error: `Unknown league code "${league}". Allowed: ${Object.keys(ALLOWED_LEAGUES).join(', ')}`,
    });
  }

  const cacheKey = `fixtures:${league}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json(cached);

  try {
    // Fetch the next 20 upcoming + recent finished matches
    const data = await footballDataFetch(
      `/competitions/${league}/matches?status=SCHEDULED,LIVE,FINISHED&limit=20`
    );

    const normalised = (data.matches || []).map((m) => ({
      id: m.id,
      source: 'football-data',
      league,
      leagueName: ALLOWED_LEAGUES[league],
      homeTeam: m.homeTeam?.name ?? 'TBD',
      awayTeam: m.awayTeam?.name ?? 'TBD',
      kickoff: m.utcDate,
      status: m.status,          // SCHEDULED | LIVE | IN_PLAY | FINISHED | POSTPONED etc.
      score: {
        home: m.score?.fullTime?.home ?? null,
        away: m.score?.fullTime?.away ?? null,
      },
      matchday: m.matchday ?? null,
    }));

    setCached(cacheKey, normalised);
    return res.json(normalised);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/external/standings?league=PL
// ---------------------------------------------------------------------------
router.get('/standings', requireAuth(), async (req, res) => {
  const league = (req.query.league || '').toUpperCase();

  if (!ALLOWED_LEAGUES[league]) {
    return res.status(400).json({
      error: `Unknown league code "${league}". Allowed: ${Object.keys(ALLOWED_LEAGUES).join(', ')}`,
    });
  }

  // Champions League uses a different standings structure — skip standings for cup competitions
  if (league === 'CL') {
    return res.json([]);
  }

  const cacheKey = `standings:${league}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json(cached);

  try {
    const data = await footballDataFetch(`/competitions/${league}/standings`);

    // standings[0] is the TOTAL table (home+away combined)
    const table = data.standings?.find((s) => s.type === 'TOTAL')?.table ?? [];

    const normalised = table.map((row) => ({
      position: row.position,
      team: row.team?.name ?? 'Unknown',
      crest: row.team?.crest ?? null,
      played: row.playedGames,
      won: row.won,
      drawn: row.draw,
      lost: row.lost,
      goalDifference: row.goalDifference,
      points: row.points,
    }));

    setCached(cacheKey, normalised);
    return res.json(normalised);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
});

module.exports = router;
