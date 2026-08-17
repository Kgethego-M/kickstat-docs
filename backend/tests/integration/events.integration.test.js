import { describe, test, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import request from 'supertest'
import express from 'express'
import { pool, resetDatabase, seedCoach } from './setup'


import eventsRouter from '../../src/routes/events'

const app = express()
app.use(express.json())
app.use('/api/events', eventsRouter)

let squadId

beforeAll(async () => {
  // Fail fast with a clear message if the test database isn't set up yet,
  // rather than a confusing connection-refused error deep in the first test.
  try {
    await pool.query('SELECT 1')
  } catch (err) {
    throw new Error(
      'Could not reach the test database. Create it and run migrations against it first — see the setup instructions.\n' +
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

async function createEvent(overrides = {}) {
  const res = await pool.query(
    `INSERT INTO events (squad_id, opponent, event_type, event_date, created_by)
     VALUES ($1, $2, $3, $4, (SELECT id FROM users WHERE clerk_id = 'test_clerk_user'))
     RETURNING *`,
    [
      squadId,
      overrides.opponent ?? 'Riverside FC',
      overrides.event_type ?? 'match',
      overrides.event_date ?? new Date(),
    ]
  )
  return res.rows[0]
}

async function createAthlete(overrides = {}) {
  const res = await pool.query(
    `INSERT INTO athletes (squad_id, name, squad_number) VALUES ($1, $2, $3) RETURNING *`,
    [squadId, overrides.name ?? 'Marcus Hale', overrides.squad_number ?? 9]
  )
  return res.rows[0]
}

describe('US13 (integration) — log a scoring moment during a live event', () => {
  test('AC: creates a real row with athlete, action type, and timestamp', async () => {
    const event = await createEvent()
    const athlete = await createAthlete()

    const res = await request(app)
      .post(`/api/events/${event.id}/logs`)
      .send({ athlete_id: athlete.id, action_type: 'goal', is_scoring: true, minute: 23 })

    expect(res.status).toBe(201)
    expect(res.body.athlete_id).toBe(athlete.id)

    const stored = await pool.query('SELECT * FROM log_entries WHERE id = $1', [res.body.id])
    expect(stored.rows).toHaveLength(1)
    expect(stored.rows[0].logged_at).not.toBeNull()
  })

  test('rejects logging against an athlete from a different squad', async () => {
    const event = await createEvent()
    // A completely different coach, not the seeded one — squads.coach_id is
    // unique-constrained, so a second squad for the SAME coach would violate it.
    const otherCoach = await pool.query(
      "INSERT INTO users (clerk_id, role) VALUES ('other_coach', 'coach') RETURNING id"
    )
    const otherSquad = await pool.query(
      `INSERT INTO squads (coach_id, name) VALUES ($1, 'Other Squad') RETURNING id`,
      [otherCoach.rows[0].id]
    )
    const otherAthlete = await pool.query(
      `INSERT INTO athletes (squad_id, name) VALUES ($1, 'Intruder') RETURNING id`,
      [otherSquad.rows[0].id]
    )

    const res = await request(app)
      .post(`/api/events/${event.id}/logs`)
      .send({ athlete_id: otherAthlete.rows[0].id, action_type: 'goal' })

    expect(res.status).toBe(400)
  })
})

describe('US14 (integration) — edit or undo a log entry', () => {
  test('AC: edit persists to the real row', async () => {
    const event = await createEvent()
    const athlete = await createAthlete()
    const created = await request(app)
      .post(`/api/events/${event.id}/logs`)
      .send({ athlete_id: athlete.id, action_type: 'goal', minute: 10 })

    const res = await request(app)
      .patch(`/api/events/${event.id}/logs/${created.body.id}`)
      .send({ action_type: 'penalty', minute: 15 })

    expect(res.status).toBe(200)

    const stored = await pool.query('SELECT action_type, minute FROM log_entries WHERE id = $1', [
      created.body.id,
    ])
    expect(stored.rows[0]).toMatchObject({ action_type: 'penalty', minute: 15 })
  })

  test('AC: undo soft-deletes — row still exists but drops out of the live timeline', async () => {
    const event = await createEvent()
    const athlete = await createAthlete()
    const created = await request(app)
      .post(`/api/events/${event.id}/logs`)
      .send({ athlete_id: athlete.id, action_type: 'goal' })

    const res = await request(app).delete(`/api/events/${event.id}/logs/${created.body.id}`)
    expect(res.status).toBe(204)

    const stored = await pool.query('SELECT deleted_at FROM log_entries WHERE id = $1', [
      created.body.id,
    ])
    expect(stored.rows[0].deleted_at).not.toBeNull()

    const timeline = await request(app).get(`/api/events/${event.id}/logs`)
    expect(timeline.body).toHaveLength(0)
  })
})

describe('US15 (integration) — final result and penalties', () => {
  test('AC: event detail aggregates real rows into a result + timeline', async () => {
    const event = await createEvent()
    const athlete = await createAthlete()

    await request(app)
      .post(`/api/events/${event.id}/logs`)
      .send({ athlete_id: athlete.id, action_type: 'goal', is_scoring: true })
    await request(app)
      .post(`/api/events/${event.id}/logs`)
      .send({ action_type: 'goal', is_scoring: true }) // opponent goal, no athlete_id
    await request(app)
      .post(`/api/events/${event.id}/logs`)
      .send({ athlete_id: athlete.id, action_type: 'yellow_card', is_scoring: false })

    const res = await request(app).get(`/api/events/${event.id}`)

    expect(res.status).toBe(200)
    expect(res.body.result).toEqual({ squad: 1, opponent: 1 })
    expect(res.body.timeline).toHaveLength(3)
    expect(res.body.penalties).toHaveLength(1)
  })
})

describe('US16 (integration) — near-real-time timeline', () => {
  test('AC: a newly logged action shows up immediately on the logs endpoint', async () => {
    const event = await createEvent()
    const athlete = await createAthlete()

    await request(app).post(`/api/events/${event.id}/logs`).send({ athlete_id: athlete.id, action_type: 'save' })

    const res = await request(app).get(`/api/events/${event.id}/logs`)
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].action_type).toBe('save')
  })
})
