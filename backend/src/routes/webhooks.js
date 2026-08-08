const express = require('express');
const { Webhook } = require('svix');
const { Pool } = require('pg');

const router = express.Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

router.post('/clerk', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET);
    const evt = wh.verify(req.body, req.headers);

    if (evt.type === 'user.created') {
      await pool.query(
        'INSERT INTO users (clerk_id, role) VALUES ($1, $2)',
        [evt.data.id, 'coach']
      );
      console.log('New user inserted:', evt.data.id);
    }

    if (evt.type === 'user.deleted') {
      await pool.query(
        'DELETE FROM users WHERE clerk_id = $1',
        [evt.data.id]
      );
      console.log('User deleted:', evt.data.id);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('Webhook error:', err.message);
    res.sendStatus(400);
  }
});

module.exports = router;
