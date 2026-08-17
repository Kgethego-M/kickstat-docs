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
      const clerkId = evt.data.id;
      const email = evt.data.email_addresses && evt.data.email_addresses[0] && evt.data.email_addresses[0].email_address;

      const inviteResult = await pool.query(
        "SELECT * FROM invites WHERE email = $1 AND status = 'pending' LIMIT 1",
        [email]
      );

      if (inviteResult.rows.length > 0) {
        const invite = inviteResult.rows[0];

        await pool.query(
          'INSERT INTO users (clerk_id, role, squad_id) VALUES ($1, $2, $3)',
          [clerkId, 'assistant', invite.squad_id]
        );

        await pool.query(
          "UPDATE invites SET status = 'accepted' WHERE id = $1",
          [invite.id]
        );

        console.log('New assistant inserted:', clerkId, 'squad:', invite.squad_id);
      } else {
        const userResult = await pool.query(
          'INSERT INTO users (clerk_id, role) VALUES ($1, $2) RETURNING id',
          [clerkId, 'coach']
        );
        const userId = userResult.rows[0].id;

        const squadResult = await pool.query(
          'INSERT INTO squads (coach_id, name) VALUES ($1, $2) RETURNING id',
          [userId, 'My Squad']
        );
        const squadId = squadResult.rows[0].id;

        await pool.query(
          'UPDATE users SET squad_id = $1 WHERE id = $2',
          [squadId, userId]
        );

        console.log('New coach inserted:', clerkId, 'squad created:', squadId);
      }
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
