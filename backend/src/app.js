require('dotenv').config();
const express = require('express');
const { clerkMiddleware, requireAuth } = require('./middleware/auth');

const app = express();

app.use(express.json());
app.use(clerkMiddleware());

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
