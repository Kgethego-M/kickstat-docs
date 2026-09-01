import { describe, test, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import request from 'supertest'
import express from 'express'
import { pool, resetDatabase, seedCoach } from './setup'

import externalRouter, { resetCache } from '../../src/routes/external'

const app = express()
app.use(express.json())
app.use('/api/external', externalRouter)

let originalFetch

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

  originalFetch = global.fetch
})

beforeEach(async () => {
  await resetDatabase()
  await seedCoach()
  resetCache()
  process.env.FOOTBALL_DATA_API_KEY = 'test_api_key'

  global.fetch = async (url) => {
    if (url.includes('/matches')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          matches: [
            {
              id: 123,
              utcDate: '2026-09-01T15:00:00Z',
              status: 'SCHEDULED',
              matchday: 1,
              homeTeam: { name: 'Home FC' },
              awayTeam: { name: 'Away FC' },
              score: { fullTime: { home: null, away: null } },
            },
          ],
        }),
      }
    }

    if (url.includes('/standings')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          standings: [
            {
              type: 'TOTAL',
              table: [
                {
                  position: 1,
                  team: { name: 'Top Team', crest: 'https://example.com/crest.png' },
                  playedGames: 2,
                  won: 2,
                  draw: 0,
                  lost: 0,
                  goalDifference: 4,
                  points: 6,
                },
              ],
            },
          ],
        }),
      }
    }

    return { ok: false, status: 404, json: async () => ({ message: 'Not found' }) }
  }
})

afterEach(() => {
  global.fetch = originalFetch
})

afterAll(async () => {
  await pool.end()
})

describe('US10/US11 — external football data API', () => {
  test('AC: GET /api/external/fixtures normalises upstream data', async () => {
    const res = await request(app)
      .get('/api/external/fixtures?league=PL')
      .set('x-test-clerk-user-id', 'test_clerk_user')

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0]).toMatchObject({
      id: 123,
      source: 'football-data',
      league: 'PL',
      leagueName: 'Premier League',
      homeTeam: 'Home FC',
      awayTeam: 'Away FC',
      status: 'SCHEDULED',
      matchday: 1,
    })
  })

  test('rejects unknown league codes', async () => {
    const res = await request(app)
      .get('/api/external/fixtures?league=XYZ')
      .set('x-test-clerk-user-id', 'test_clerk_user')

    expect(res.status).toBe(400)
    expect(res.body.error).toContain('Unknown league code')
  })

  test('returns 503 when the API key is missing', async () => {
    delete process.env.FOOTBALL_DATA_API_KEY

    const res = await request(app)
      .get('/api/external/fixtures?league=PL')
      .set('x-test-clerk-user-id', 'test_clerk_user')

    expect(res.status).toBe(503)
    expect(res.body.error).toBe('External API not configured')
  })

  test('AC: GET /api/external/standings returns a normalised table', async () => {
    const res = await request(app)
      .get('/api/external/standings?league=PL')
      .set('x-test-clerk-user-id', 'test_clerk_user')

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0]).toMatchObject({
      position: 1,
      team: 'Top Team',
      crest: 'https://example.com/crest.png',
      played: 2,
      won: 2,
      drawn: 0,
      lost: 0,
      goalDifference: 4,
      points: 6,
    })
  })

  test('Champions League standings returns an empty array', async () => {
    const res = await request(app)
      .get('/api/external/standings?league=CL')
      .set('x-test-clerk-user-id', 'test_clerk_user')

    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })
})
