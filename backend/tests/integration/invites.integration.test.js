import { describe, test, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import request from 'supertest'
import express from 'express'
import { pool, resetDatabase, seedCoach } from './setup'

import invitesRouter from '../../src/routes/invites'

const app = express()
app.use(express.json())
app.use('/api/invites', invitesRouter)

let squadId

beforeAll(async () => {
  process.env.FRONTEND_URL = 'http://localhost:5173'

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
  const seeded = await seedCoach()
  squadId = seeded.squadId
})

afterAll(async () => {
  await pool.end()
})

describe('US6/US22 — assistant and athlete invites', () => {
  test('AC: coach can create an assistant invite', async () => {
    const res = await request(app)
      .post('/api/invites')
      .set('x-test-clerk-user-id', 'test_clerk_user')
      .send({ email: 'assistant@example.com' })

    expect(res.status).toBe(201)
    expect(res.body.inviteId).toBeDefined()
    expect(res.body.inviteLink).toContain('/invite/')
  })

  test('accepting an invite links the signed-in user to the squad', async () => {
    const created = await request(app)
      .post('/api/invites')
      .set('x-test-clerk-user-id', 'test_clerk_user')
      .send({ email: 'assistant@example.com' })

    const token = created.body.inviteLink.split('/invite/')[1]

    const res = await request(app)
      .post(`/api/invites/${token}/accept`)
      .set('x-test-clerk-user-id', 'new_assistant')
      .set('x-test-invite-email', 'assistant@example.com')

    expect(res.status).toBe(200)
    expect(res.body.role).toBe('assistant')
    expect(res.body.squadId).toBe(squadId)
  })

  test('accepting an invite with a mismatched email is rejected', async () => {
    const created = await request(app)
      .post('/api/invites')
      .set('x-test-clerk-user-id', 'test_clerk_user')
      .send({ email: 'assistant@example.com' })

    const token = created.body.inviteLink.split('/invite/')[1]

    const res = await request(app)
      .post(`/api/invites/${token}/accept`)
      .set('x-test-clerk-user-id', 'wrong_user')
      .set('x-test-invite-email', 'wrong@example.com')

    expect(res.status).toBe(403)
    expect(res.body.error).toContain('does not match')
  })

  test('accepting an unknown or already-used invite returns 404', async () => {
    const used = await request(app)
      .post('/api/invites/not-a-real-token/accept')
      .set('x-test-clerk-user-id', 'someone')

    expect(used.status).toBe(404)
  })

  test('AC: public verify endpoint returns invite details', async () => {
    const created = await request(app)
      .post('/api/invites')
      .set('x-test-clerk-user-id', 'test_clerk_user')
      .send({ email: 'assistant@example.com' })

    const token = created.body.inviteLink.split('/invite/')[1]

    const res = await request(app).get(`/api/invites/verify/${token}`)

    expect(res.status).toBe(200)
    expect(res.body.email).toBe('assistant@example.com')
    expect(res.body.role).toBe('assistant')
  })

  test('verify endpoint returns 410 for an already-accepted invite', async () => {
    const created = await request(app)
      .post('/api/invites')
      .set('x-test-clerk-user-id', 'test_clerk_user')
      .send({ email: 'assistant@example.com' })

    const token = created.body.inviteLink.split('/invite/')[1]

    await request(app)
      .post(`/api/invites/${token}/accept`)
      .set('x-test-clerk-user-id', 'new_assistant')
      .set('x-test-invite-email', 'assistant@example.com')

    const res = await request(app).get(`/api/invites/verify/${token}`)

    expect(res.status).toBe(410)
  })
})
