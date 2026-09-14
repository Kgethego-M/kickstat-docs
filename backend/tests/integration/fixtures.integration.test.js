import { describe, test, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import request from 'supertest'
import express from 'express'
import { pool, resetDatabase } from './setup'

import eventsRouter from '../../src/routes/events'
import fixturesRouter from '../../src/routes/fixtures'
import athletesRouter from '../../src/routes/athletes'
import squadsRouter from '../../src/routes/squads'

const app = express()
app.use(express.json())
app.use('/api/events', eventsRouter)
app.use('/api/fixtures', fixturesRouter)
app.use('/api/athletes', athletesRouter)
app.use('/api/squads', squadsRouter)

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
})

afterAll(async () => {
  await pool.end()
})

// League/tournament creation and joining now require a squad to meet its
// min_roster_size (defaults to 11) before it can field a team — seed enough
// generic athletes onto a squad so those flows are actually reachable here.
async function seedRoster(targetSquadId, count = 11) {
  for (let i = 0; i < count; i++) {
    await pool.query(
      `INSERT INTO athletes (squad_id, name, squad_number) VALUES ($1, $2, $3)`,
      [targetSquadId, `Squad Player ${i + 1}`, i + 1]
    )
  }
}

async function createLeague() {
  // Resolve (self-heal) the creator's own squad first via GET /api/squads/mine,
  // so we have a squadId to seed athletes onto *before* creating the league —
  // the league-creation endpoint now requires the roster minimum up front.
  const mySquad = await request(app)
    .get('/api/squads/mine')
    .set('x-test-clerk-user-id', 'test_clerk_user')
  await seedRoster(mySquad.body.id)

  const created = await request(app)
    .post('/api/events')
    .set('x-test-clerk-user-id', 'test_clerk_user')
    .send({
      title: 'Fixture Test League',
      format: 'league',
      required_teams: 2,
      event_date: new Date().toISOString(),
    })

  const eventId = created.body.id

  // Create a second coach+squad and join the league.
  await pool.query("INSERT INTO users (clerk_id, role) VALUES ('coach_two', 'coach') RETURNING id")
  const squad2 = await pool.query(
    'INSERT INTO squads (coach_id, name) VALUES ((SELECT id FROM users WHERE clerk_id = $1), $2) RETURNING id',
    ['coach_two', 'Coach Two Squad']
  )
  await seedRoster(squad2.rows[0].id)

  await request(app)
    .post(`/api/events/${eventId}/join`)
    .set('x-test-clerk-user-id', 'coach_two')

  const detail = await request(app)
    .get(`/api/events/${eventId}`)
    .set('x-test-clerk-user-id', 'test_clerk_user')

  const creatorSquadId = detail.body.teams.find((t) => t.is_mine).squad_id
  const homeFixture = detail.body.fixtures.find((f) => f.home_squad_id === creatorSquadId)

  return { eventId, fixtureId: homeFixture.id, awaySquadId: squad2.rows[0].id }
}

describe('US15/US16 — fixture detail and live logging', () => {
  test('AC: GET fixture detail returns result and timeline', async () => {
    const { fixtureId } = await createLeague()

    const res = await request(app)
      .get(`/api/fixtures/${fixtureId}`)
      .set('x-test-clerk-user-id', 'test_clerk_user')

    expect(res.status).toBe(200)
    expect(res.body.fixture).toBeDefined()
    expect(res.body.result).toEqual({ home: 0, away: 0 })
    expect(res.body.timeline).toEqual([])
    expect(res.body.canLog).toBe(true)
  })

  test('AC: away team cannot update the fixture', async () => {
    const { fixtureId } = await createLeague()

    const res = await request(app)
      .patch(`/api/fixtures/${fixtureId}`)
      .set('x-test-clerk-user-id', 'coach_two')
      .send({ status: 'completed' })

    expect(res.status).toBe(403)
  })

  test('AC: home team can log a goal and result updates', async () => {
    const { fixtureId } = await createLeague()

    const athleteRes = await request(app)
      .post('/api/athletes')
      .set('x-test-clerk-user-id', 'test_clerk_user')
      .send({ name: 'Striker', squad_number: 9 })
    const athleteId = athleteRes.body.id

    const logRes = await request(app)
      .post(`/api/fixtures/${fixtureId}/logs`)
      .set('x-test-clerk-user-id', 'test_clerk_user')
      .send({ athlete_id: athleteId, action_type: 'goal', is_scoring: true, value: 1, minute: 12 })

    expect(logRes.status).toBe(201)

    const detail = await request(app)
      .get(`/api/fixtures/${fixtureId}`)
      .set('x-test-clerk-user-id', 'test_clerk_user')

    expect(detail.body.result).toEqual({ home: 1, away: 0 })
    expect(detail.body.timeline).toHaveLength(1)
  })

  test('rejects logging for an athlete from another squad', async () => {
    const { fixtureId, awaySquadId } = await createLeague()

    const athleteRes = await pool.query(
      'INSERT INTO athletes (squad_id, name) VALUES ($1, $2) RETURNING id',
      [awaySquadId, 'Away Striker']
    )
    const awayAthleteId = athleteRes.rows[0].id

    const res = await request(app)
      .post(`/api/fixtures/${fixtureId}/logs`)
      .set('x-test-clerk-user-id', 'test_clerk_user')
      .send({ athlete_id: awayAthleteId, action_type: 'goal' })

    expect(res.status).toBe(400)
  })

  test('AC: edit and undo a fixture log entry', async () => {
    const { fixtureId } = await createLeague()

    const athleteRes = await request(app)
      .post('/api/athletes')
      .set('x-test-clerk-user-id', 'test_clerk_user')
      .send({ name: 'Midfielder' })
    const athleteId = athleteRes.body.id

    const created = await request(app)
      .post(`/api/fixtures/${fixtureId}/logs`)
      .set('x-test-clerk-user-id', 'test_clerk_user')
      .send({ athlete_id: athleteId, action_type: 'goal', minute: 5 })

    const logId = created.body.id

    const edited = await request(app)
      .patch(`/api/fixtures/${fixtureId}/logs/${logId}`)
      .set('x-test-clerk-user-id', 'test_clerk_user')
      .send({ minute: 7 })

    expect(edited.status).toBe(200)
    expect(edited.body.minute).toBe(7)

    const deleted = await request(app)
      .delete(`/api/fixtures/${fixtureId}/logs/${logId}`)
      .set('x-test-clerk-user-id', 'test_clerk_user')

    expect(deleted.status).toBe(204)

    const logs = await request(app)
      .get(`/api/fixtures/${fixtureId}/logs`)
      .set('x-test-clerk-user-id', 'test_clerk_user')

    expect(logs.body).toHaveLength(0)
  })
})
