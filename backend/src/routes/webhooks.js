const express = require('express');
const { Webhook } = require('svix');
const { Pool } = require('pg');

const router = express.Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// NOTE: user.created no longer does anything here. Two other mechanisms
// already cover account setup, and having a third (this webhook, guessing
// role/squad from email matching) created a real race condition:
//   - Plain signup, no invite: _squad.js self-heals a coach + squad on that
//     user's first authenticated API call.
//   - Invite signup: POST /api/invites/:token/accept (called explicitly by
//     InviteAccept.jsx once signed in) sets the correct role/squad/athlete
//     link. Unlike this webhook, it actually knows which invite token the
//     signup corresponds to — Clerk's webhook payload never carries that.
router.post('/clerk', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET);
    const evt = wh.verify(req.body, req.headers);

    if (evt.type === 'user.deleted') {
      await pool.query('DELETE FROM users WHERE clerk_id = $1', [evt.data.id]);
      console.log('User deleted:', evt.data.id);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('Webhook error:', err.message);
    res.sendStatus(400);
  }
});

module.exports = router;
