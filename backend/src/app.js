require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { clerkMiddleware, requireAuth } = require('./middleware/auth');
const webhooksRouter = require('./routes/webhooks');
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

app.use('/api/invites', invitesRouter);

// Public route — health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Protected route example — requires a logged-in user
app.get('/api/me', requireAuth(), (req, res) => {
  res.json({ userId: req.auth.userId });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
