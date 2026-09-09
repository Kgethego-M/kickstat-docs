import { describe, test, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import request from 'supertest'
import express from 'express'
import crypto from 'crypto'
import { pool, resetDatabase } from './setup'

import webhooksRouter from '../../src/routes/webhooks'
import athletesRouter from '../../src/routes/athletes'
import invitesRouter from '../../src/routes/invites'

const app = express()
// Mirrors src/app.js's ordering: webhooks need the raw body, so they're
// mounted before express.json() touches the request.
app.use('/webhooks', webhooksRouter)
app.use(express.json())
app.use('/api/athletes', athletesRouter)
app.use('/api/invites', invitesRouter)

// Clerk webhooks are verified by svix using an HMAC-SHA256 signature over
// `${id}.${timestamp}.${payload}`, base64-encoded, prefixed "v1,". This
// reproduces that so we can send a request that webhooks.js will actually
// accept, without needing a real Clerk account.
function signSvixPayload(secret, payload) {
  const id = 'msg_test_' + crypto.randomBytes(8).toString('hex')
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const secretBytes = Buffer.from(secret.split('_')[1], 'base64')
  const signature = crypto
    .createHmac('sha256', secretBytes)
    .update(`${id}.${timestamp}.${payload}`)
    .digest('base64')

  return {
    'svix-id': id,
    'svix-timestamp': timestamp,
    'svix-signature': `v1,${signature}`,
  }
}

const TEST_WEBHOOK_SECRET = 'whsec_dGVzdF9zZWNyZXRfZm9yX2NpX29ubHk='

async function postClerkWebhook(eventBody) {
  const payload = JSON.stringify(eventBody)
  const headers = signSvixPayload(TEST_WEBHOOK_SECRET, payload)

  return request(app)
    .post('/webhooks/clerk')
    .set(headers)
    .set('Content-Type', 'application/json')
    .send(payload)
}

beforeAll(async () => {
  process.env.CLERK_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET

  try {
    await pool.query('SELECT 1')
  } catch (err) {
    throw new Error(
      'Could not reach the test database. Create it and run migrations against it first.\n' +
        `Original error: ${err.message}`,
      { cause: err }
    )
  }
})

beforeEach(async () => {
  await resetDatabase()
})

afterAll(async () => {
  await pool.end()
})

// NOTE: There is no longer a "US1/US21 — coach registration via Clerk
// webhook" test here. That behavior was deliberately removed from
// webhooks.js (see the comment at the top of that file) because it raced
// with _squad.js's self-healing coach+squad creation on first authenticated
// API call. That self-healing behavior is already covered by
// squad.integration.test.js ("self-heals by creating a new user row when
// none exists yet" / "self-heals by creating a squad ... for a brand-new
// coach") — no need to duplicate it here against a code path that no
// longer exists.

describe('US23 — invited assistant accepts via POST /api/invites/:token/accept', () => {
  test('AC: accepting a pending invite links the account to that squad as an assistant', async () => {
    const coach = await pool.query(
      "INSERT INTO users (clerk_id, role) VALUES ('inviting_coach', 'coach') RETURNING id"
    )
    const squad = await pool.query(
      'INSERT INTO squads (coach_id, name) VALUES ($1, $2) RETURNING id',
      [coach.rows[0].id, 'Invite Test Squad']
    )
    await pool.query(
      `INSERT INTO invites (email, squad_id, invited_by, token, role, status)
       VALUES ('assistant@example.com', $1, $2, 'test_token', 'assistant', 'pending')`,
      [squad.rows[0].id, coach.rows[0].id]
    )

    const res = await request(app)
      .post('/api/invites/test_token/accept')
      .set('x-test-clerk-user-id', 'clerk_new_assistant')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ role: 'assistant', squadId: squad.rows[0].id })

    const user = await pool.query(
      'SELECT role, squad_id FROM users WHERE clerk_id = $1',
      ['clerk_new_assistant']
    )
    expect(user.rows[0].role).toBe('assistant')
    expect(user.rows[0].squad_id).toBe(squad.rows[0].id)

    const invite = await pool.query("SELECT status FROM invites WHERE token = 'test_token'")
    expect(invite.rows[0].status).toBe('accepted')
  })

  test('AC: an unknown or already-used token is rejected', async () => {
    const res = await request(app)
      .post('/api/invites/not_a_real_token/accept')
      .set('x-test-clerk-user-id', 'clerk_someone')

    expect(res.status).toBe(404)
  })
})

describe('US2 — account deletion cascades via Clerk webhook', () => {
  test('AC: deleting a coach removes their squad and athletes with it', async () => {
    const coach = await pool.query(
      "INSERT INTO users (clerk_id, role) VALUES ('coach_to_delete', 'coach') RETURNING id"
    )
    const squad = await pool.query(
      'INSERT INTO squads (coach_id, name) VALUES ($1, $2) RETURNING id',
      [coach.rows[0].id, 'Doomed Squad']
    )
    await pool.query(
      "INSERT INTO athletes (squad_id, name) VALUES ($1, 'Some Athlete')",
      [squad.rows[0].id]
    )

    const res = await postClerkWebhook({
      type: 'user.deleted',
      data: { id: 'coach_to_delete' },
    })

    expect(res.status).toBe(200)

    const user = await pool.query(
      "SELECT * FROM users WHERE clerk_id = 'coach_to_delete'"
    )
    expect(user.rows).toHaveLength(0)

    const remainingSquad = await pool.query('SELECT * FROM squads WHERE id = $1', [
      squad.rows[0].id,
    ])
    expect(remainingSquad.rows).toHaveLength(0)
  })
})

describe('US26 — assistants cannot write to the roster', () => {
  test('AC: an authenticated assistant is rejected (not merely hidden by the UI) when adding an athlete', async () => {
    const coach = await pool.query(
      "INSERT INTO users (clerk_id, role) VALUES ('roster_coach', 'coach') RETURNING id"
    )
    const squad = await pool.query(
      'INSERT INTO squads (coach_id, name) VALUES ($1, $2) RETURNING id',
      [coach.rows[0].id, 'Squad With Assistant']
    )
    await pool.query(
      "INSERT INTO users (clerk_id, role, squad_id) VALUES ('roster_assistant', 'assistant', $1)",
      [squad.rows[0].id]
    )

    const res = await request(app)
      .post('/api/athletes')
      .set('x-test-clerk-user-id', 'roster_assistant')
      .send({ name: 'Snuck-in Athlete' })

    expect(res.status).toBe(403)
  })
})
