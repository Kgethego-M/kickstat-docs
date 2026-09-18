require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const { clerkMiddleware, requireAuth } = require('./middleware/auth');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');
const webhooksRouter = require('./routes/webhooks');
const dashboardRouter = require('./routes/dashboard');
const squadsRouter = require('./routes/squads');
const athletesRouter = require('./routes/athletes');
const eventsRouter = require('./routes/events');
const fixturesRouter = require('./routes/fixtures');
const invitesRouter = require('./routes/invites');
const externalRouter = require('./routes/external');
const accountRouter = require('./routes/account');
const weatherRouter = require('./routes/weather');
const injuriesRouter = require('./routes/injuries');
const { sendEventReminders } = require('./lib/reminders');

const app = express();

app.use('/webhooks', webhooksRouter);
app.use(cors({
  // FRONTEND_URL carries the deployed frontend origin (set on the hosting
  // platform); the extra ports cover local Vite dev servers, which bump the
  // port when 5173 is already in use.
  origin: [
    process.env.FRONTEND_URL,
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
  ].filter(Boolean),
  credentials: true,
}));
app.use(express.json());
app.use('/api/dashboard', dashboardRouter);
app.use(clerkMiddleware());

// Moved here from before `const app = express()` — that's what was crashing
// the server. Everything else in this block is unchanged from what you sent.
if (process.env.NODE_ENV !== 'test') {
  const swaggerDocument = YAML.load(path.join(__dirname, '..', 'openapi.yml'));
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
}

app.use('/api/squads', squadsRouter);
app.use('/api/athletes', athletesRouter);
app.use('/api/events', eventsRouter);
app.use('/api/fixtures', fixturesRouter);
app.use('/api/invites', invitesRouter);
app.use('/api/external', externalRouter);
app.use('/api/account', accountRouter);
app.use('/api/weather', weatherRouter);
app.use('/api/injuries', injuriesRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Protected route example — requires a logged-in user
app.get('/api/me', requireAuth(), (req, res) => {
  res.json({ userId: req.auth.userId });
});

// ---- Auto-transition sweep ----
// Runs periodically so events don't require a manual "Start live"/"End event"
// click: scheduled -> live once event_date passes, live -> completed once
// started_at + duration_minutes passes (falling back to event_date for rows
// that went live before started_at existed). Manual buttons on the frontend
// still work as an override (e.g. starting a delayed match early/late).
const sweepPool = new Pool({ connectionString: process.env.DATABASE_URL });

async function runAutoTransitionSweep() {
  try {
    // Simple events only. League/tournament containers also pass through a
    // 'scheduled' state (while teams are joining) and must never auto-start;
    // their fixtures transition individually below.
    await sweepPool.query(
      `UPDATE events SET status = 'live', started_at = COALESCE(started_at, now()), updated_at = now()
       WHERE status = 'scheduled' AND format IN ('match', 'training') AND event_date <= now()`
    );
    await sweepPool.query(
      `UPDATE events SET status = 'completed', updated_at = now()
       WHERE status = 'live' AND format IN ('match', 'training')
         AND COALESCE(started_at, event_date) + (COALESCE(duration_minutes, 90) || ' minutes')::interval <= now()`
    );

    // League/tournament fixtures
    await sweepPool.query(
      `UPDATE fixtures SET status = 'live', started_at = COALESCE(started_at, now()), updated_at = now()
       WHERE status = 'scheduled' AND event_date <= now()`
    );
    await sweepPool.query(
      `UPDATE fixtures f
       SET status = 'completed', updated_at = now()
       FROM events e
       WHERE f.status = 'live'
         AND f.event_id = e.id
         AND COALESCE(f.started_at, f.event_date) + (COALESCE(e.duration_minutes, 90) || ' minutes')::interval <= now()`
    );
  } catch (err) {
    console.error('Auto-transition sweep failed:', err.message);
  }
}

runAutoTransitionSweep();
setInterval(runAutoTransitionSweep, 60 * 1000);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// ---- Event reminder sweep ----
// AI assistance: drafted with Claude (Sonnet 5) via claude.ai; reviewed and tested by the project team.
// Sends email reminders to coaches for scheduled events starting within the
// next 24 hours. Runs immediately on startup and then every hour.
sendEventReminders(sweepPool);
setInterval(() => sendEventReminders(sweepPool), 60 * 60 * 1000);