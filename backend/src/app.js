require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { clerkMiddleware, getAuth } = require('./middleware/auth');
const webhooksRouter = require('./routes/webhooks');
const squadsRouter = require('./routes/squads');
const athletesRouter = require('./routes/athletes');
const invitesRouter = require('./routes/invites');

const app = express();

app.use('/webhooks', webhooksRouter);

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
}));
app.use(express.json());
app.use(clerkMiddleware());

app.use('/api/squads', squadsRouter);
app.use('/api/athletes', athletesRouter);
app.use('/api/invites', invitesRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/me', (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  res.json({ userId });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
