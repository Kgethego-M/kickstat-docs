const { execSync } = require('child_process');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

beforeAll(() => {
  // Applies every migration in backend/migrations against the DB pointed
  // to by DATABASE_URL (in CI this is the ephemeral Postgres service
  // container defined in .gitea/workflows/ci.yml).
  execSync('npx node-pg-migrate up', {
    env: process.env,
    stdio: 'inherit',
  });
});

afterAll(async () => {
  await pool.end();
});

describe('users table migration', () => {
  it('creates a users table with the expected columns', async () => {
    const { rows } = await pool.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_name = 'users'
       ORDER BY column_name`
    );

    const columns = rows.map((r) => r.column_name);

    expect(columns).toEqual(
      expect.arrayContaining(['id', 'clerk_id', 'role', 'squad_id', 'created_at'])
    );
  });

  it('enforces a unique constraint on clerk_id', async () => {
    await pool.query(`INSERT INTO users (clerk_id, role) VALUES ($1, $2)`, [
      'test_clerk_id_1',
      'coach',
    ]);

    await expect(
      pool.query(`INSERT INTO users (clerk_id, role) VALUES ($1, $2)`, [
        'test_clerk_id_1',
        'coach',
      ])
    ).rejects.toThrow();
  });
});