// AI assistance: drafted with Claude (Sonnet 5) via claude.ai; reviewed and tested by the project team.
import { describe, test, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import { pool, resetDatabase } from './setup'
import { sendEventReminders } from '../../src/lib/reminders'

describe('Event reminders', () => {
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

  test('marks an upcoming event as reminded after sending', async () => {
    const user = await pool.query(
      "INSERT INTO users (clerk_id, role) VALUES ('coach_reminder', 'coach') RETURNING id"
    )
    const squad = await pool.query(
      'INSERT INTO squads (coach_id, name) VALUES ($1, $2) RETURNING id',
      [user.rows[0].id, 'Reminder Squad']
    )

    const in23Hours = new Date(Date.now() + 23 * 60 * 60 * 1000).toISOString()

    const event = await pool.query(
      `INSERT INTO events (squad_id, opponent, event_type, event_date, status, created_by, reminder_sent)
       VALUES ($1, $2, $3, $4, $5, $6, false) RETURNING *`,
      [squad.rows[0].id, 'Riverside FC', 'match', in23Hours, 'scheduled', user.rows[0].id]
    )

    await sendEventReminders(pool)

    const updated = await pool.query('SELECT reminder_sent FROM events WHERE id = $1', [
      event.rows[0].id,
    ])

    expect(updated.rows[0].reminder_sent).toBe(true)
  })

  test('does not remind events outside the 24-hour window', async () => {
    const user = await pool.query(
      "INSERT INTO users (clerk_id, role) VALUES ('coach_later', 'coach') RETURNING id"
    )
    const squad = await pool.query(
      'INSERT INTO squads (coach_id, name) VALUES ($1, $2) RETURNING id',
      [user.rows[0].id, 'Later Squad']
    )

    const in48Hours = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()

    const event = await pool.query(
      `INSERT INTO events (squad_id, opponent, event_type, event_date, status, created_by, reminder_sent)
       VALUES ($1, $2, $3, $4, $5, $6, false) RETURNING *`,
      [squad.rows[0].id, 'Future FC', 'match', in48Hours, 'scheduled', user.rows[0].id]
    )

    await sendEventReminders(pool)

    const updated = await pool.query('SELECT reminder_sent FROM events WHERE id = $1', [
      event.rows[0].id,
    ])

    expect(updated.rows[0].reminder_sent).toBe(false)
  })
})
