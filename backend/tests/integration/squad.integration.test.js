import { describe, test, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import { pool, resetDatabase } from './setup'
import { getOrCreateUserId, getOwnedSquadId } from '../../src/routes/_squad'

// No mocking at all in this file — these call the real functions against the
// real test database, specifically to hit branches the route-level integration
// tests don't reach (since those pre-seed a user/squad directly via SQL and
// never exercise the "not found yet" or "concurrent creation" paths).

beforeAll(async () => {
  try {
    await pool.query('SELECT 1')
  } catch (err) {
    throw new Error(
      'Could not reach the test database. Create it and run migrations against it first.\n' +
        `Original error: ${err.message}`
    )
  }
})

beforeEach(async () => {
  await resetDatabase()
})

afterAll(async () => {
  await pool.end()
})

describe('_squad.js — getOrCreateUserId', () => {
  test('returns the existing user id when one already exists', async () => {
    const inserted = await pool.query(
      "INSERT INTO users (clerk_id, role) VALUES ('existing_user', 'coach') RETURNING id"
    )

    const userId = await getOrCreateUserId(pool, 'existing_user')

    expect(userId).toBe(inserted.rows[0].id)
  })

  test('self-heals by creating a new user row when none exists yet', async () => {
    const before = await pool.query('SELECT COUNT(*) FROM users')
    const userId = await getOrCreateUserId(pool, 'brand_new_user')
    const after = await pool.query('SELECT COUNT(*) FROM users')

    expect(userId).toBeDefined()
    expect(Number(after.rows[0].count)).toBe(Number(before.rows[0].count) + 1)

    const stored = await pool.query('SELECT clerk_id FROM users WHERE id = $1', [userId])
    expect(stored.rows[0].clerk_id).toBe('brand_new_user')
  })

  test('handles two simultaneous requests for the same new user without erroring', async () => {
    // Forces the unique-constraint conflict branch: whichever INSERT loses the
    // race should catch the 23505 and fall back to SELECT instead of throwing.
    const [idA, idB] = await Promise.all([
      getOrCreateUserId(pool, 'race_user'),
      getOrCreateUserId(pool, 'race_user'),
    ])

    expect(idA).toBe(idB)

    const count = await pool.query("SELECT COUNT(*) FROM users WHERE clerk_id = 'race_user'")
    expect(Number(count.rows[0].count)).toBe(1)
  })
})

describe('_squad.js — getOwnedSquadId', () => {
  test('returns the existing squad id when the coach already has one', async () => {
    const user = await pool.query(
      "INSERT INTO users (clerk_id, role) VALUES ('coach_with_squad', 'coach') RETURNING id"
    )
    const squad = await pool.query(
      'INSERT INTO squads (coach_id, name) VALUES ($1, $2) RETURNING id',
      [user.rows[0].id, 'Existing Squad']
    )

    const squadId = await getOwnedSquadId(pool, 'coach_with_squad')

    expect(squadId).toBe(squad.rows[0].id)
  })

  test('self-heals by creating a squad (and the user row) for a brand-new coach', async () => {
    const squadId = await getOwnedSquadId(pool, 'coach_without_squad')

    expect(squadId).toBeDefined()
    const stored = await pool.query('SELECT name FROM squads WHERE id = $1', [squadId])
    expect(stored.rows[0].name).toBe('My Squad')
  })

  test('handles two simultaneous requests for the same new coach without erroring', async () => {
    const [idA, idB] = await Promise.all([
      getOwnedSquadId(pool, 'race_coach'),
      getOwnedSquadId(pool, 'race_coach'),
    ])

    expect(idA).toBe(idB)

    const user = await pool.query("SELECT id FROM users WHERE clerk_id = 'race_coach'")
    const count = await pool.query('SELECT COUNT(*) FROM squads WHERE coach_id = $1', [
      user.rows[0].id,
    ])
    expect(Number(count.rows[0].count)).toBe(1)
  })
})
