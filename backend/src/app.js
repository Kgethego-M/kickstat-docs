require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const { clerkMiddleware, requireAuth } = require('./middleware/auth');
const webhooksRouter = require('./routes/webhooks');
const squadsRouter = require('./routes/squads');
const athletesRouter = require('./routes/athletes');
const eventsRouter = require('./routes/events');
const invitesRouter = require('./routes/invites');

const app = express();

// Webhook route MUST come before express.json() — needs raw body for signature verification
app.use('/webhooks', webhooksRouter);
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
}));
app.use(express.json());
app.use(clerkMiddleware());
app.use('/api/squads', squadsRouter);
app.use('/api/athletes', athletesRouter);
app.use('/api/events', eventsRouter);
app.use('/api/invites', invitesRouter);

// Public route — health check
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
// event_date + duration_minutes passes. Manual buttons on the frontend still
// work as an override (e.g. starting a delayed match early/late).
const sweepPool = new Pool({ connectionString: process.env.DATABASE_URL });

async function runAutoTransitionSweep() {
  try {
    await sweepPool.query(
      `UPDATE events SET status = 'live', updated_at = now()
       WHERE status = 'scheduled' AND event_date <= now()`
    );
    await sweepPool.query(
      `UPDATE events SET status = 'completed', updated_at = now()
       WHERE status = 'live'
         AND event_date + (COALESCE(duration_minutes, 90) || ' minutes')::interval <= now()`
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
