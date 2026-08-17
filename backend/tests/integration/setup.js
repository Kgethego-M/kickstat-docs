const { Pool } = require('pg')

// A separate database from your dev one — never point this at 'sportcoach' itself,
// or tests will TRUNCATE your real data between every test.
// In CI, the workflow sets DATABASE_URL to the ephemeral Postgres service
// container (correct host/creds for that environment) but doesn't set
// TEST_DATABASE_URL specifically — so fall back to DATABASE_URL before the
// hardcoded local default, rather than silently trying to hit localhost
// inside the CI container where nothing is listening.
const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  process.env.DATABASE_URL ||
  'postgresql://kgethi:devpassword@localhost:5432/sportcoach_test'

// Route files read process.env.DATABASE_URL at import time to build their own
// Pool — setting it here (before any route file is imported) redirects them
// at the real test database instead of your dev one.
process.env.DATABASE_URL = TEST_DATABASE_URL

const pool = new Pool({ connectionString: TEST_DATABASE_URL })

async function resetDatabase() {
  // Children before parents, respecting foreign keys. RESTART IDENTITY so ids
  // are predictable/small across tests.
  await pool.query(
    'TRUNCATE log_entries, events, athletes, squads, users RESTART IDENTITY CASCADE'
  )
}

async function seedCoach(clerkId = 'test_clerk_user') {
  const userResult = await pool.query(
    "INSERT INTO users (clerk_id, role) VALUES ($1, 'coach') RETURNING id",
    [clerkId]
  )
  const userId = userResult.rows[0].id

  const squadResult = await pool.query(
    "INSERT INTO squads (coach_id, name) VALUES ($1, 'Test Squad') RETURNING id",
    [userId]
  )

  return { userId, squadId: squadResult.rows[0].id }
}

module.exports = { pool, resetDatabase, seedCoach }
