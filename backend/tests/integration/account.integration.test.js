import { describe, test, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import request from 'supertest'
import express from 'express'
import { pool, resetDatabase, seedCoach } from './setup'

import accountRouter from '../../src/routes/account'

const app = express()
app.use(express.json())
app.use('/api/account', accountRouter)

let squadId

beforeAll(async () => {
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

describe('Account profile', () => {
  test('AC: GET /api/account/me returns role and user info for a coach', async () => {
    const res = await request(app)
      .get('/api/account/me')
      .set('x-test-clerk-user-id', 'test_clerk_user')

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      userId: 'test_clerk_user',
      role: 'coach',
      athleteId: null,
    })
    expect(res.body.squadId !== undefined).toBe(true)
  })

  test('AC: GET /api/account/me creates a user row for an unknown authenticated user', async () => {
    const res = await request(app)
      .get('/api/account/me')
      .set('x-test-clerk-user-id', 'brand_new_user')

    expect(res.status).toBe(200)
    expect(res.body.role).toBe('coach')
    expect(res.body.squadId).toBeDefined()
  })

  test('AC: GET /api/account/me returns athleteId for an athlete user', async () => {
    const athleteRes = await pool.query(
      'INSERT INTO athletes (squad_id, name) VALUES ($1, $2) RETURNING id',
      [squadId, 'Linked Athlete']
    )
    const athleteId = athleteRes.rows[0].id

    const userRes = await pool.query(
      'INSERT INTO users (clerk_id, role, squad_id) VALUES ($1, $2, $3) RETURNING id',
      ['athlete_user', 'athlete', squadId]
    )
    const userId = userRes.rows[0].id

    await pool.query('UPDATE athletes SET user_id = $1 WHERE id = $2', [userId, athleteId])

    const res = await request(app)
      .get('/api/account/me')
      .set('x-test-clerk-user-id', 'athlete_user')

    expect(res.status).toBe(200)
    expect(res.body.role).toBe('athlete')
    expect(res.body.athleteId).toBe(athleteId)
  })
})

describe('Account deletion', () => {
  test('AC: DELETE /api/account/me removes the user and their squad', async () => {
    const res = await request(app)
      .delete('/api/account/me')
      .set('x-test-clerk-user-id', 'test_clerk_user')

    expect(res.status).toBe(204)

    const user = await pool.query('SELECT * FROM users WHERE clerk_id = $1', ['test_clerk_user'])
    expect(user.rows).toHaveLength(0)

    const squad = await pool.query('SELECT * FROM squads WHERE id = $1', [squadId])
    expect(squad.rows).toHaveLength(0)
  })
})
