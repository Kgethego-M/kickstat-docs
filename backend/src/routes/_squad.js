// Shared helpers for resolving/creating the logged-in coach's user row and squad.

// Get (or lazily create) the internal users.id for a given Clerk user.
// Clerk's user.created webhook is what's SUPPOSED to insert this row, but that
// webhook can't reach a local dev server without a public tunnel (ngrok, Clerk
// CLI, etc.), so every route that needs a user id calls this instead of
// assuming the row already exists.
async function getOrCreateUserId(pool, clerkUserId) {
  const existing = await pool.query('SELECT id FROM users WHERE clerk_id = $1', [clerkUserId]);
  if (existing.rows.length > 0) {
    return existing.rows[0].id;
  }

  try {
    const inserted = await pool.query(
      'INSERT INTO users (clerk_id) VALUES ($1) RETURNING id',
      [clerkUserId]
    );
    return inserted.rows[0].id;
  } catch (insertErr) {
    // Concurrent request already created it
    if (insertErr.code === '23505') {
      const retry = await pool.query('SELECT id FROM users WHERE clerk_id = $1', [clerkUserId]);
      return retry.rows[0].id;
    }
    throw insertErr;
  }
}

// Get (or lazily create) the squad_id owned by a coach.
async function getOwnedSquadId(pool, clerkUserId) {
  const userId = await getOrCreateUserId(pool, clerkUserId);

  let squadResult = await pool.query('SELECT id FROM squads WHERE coach_id = $1', [userId]);

  if (squadResult.rows.length === 0) {
    try {
      squadResult = await pool.query(
        'INSERT INTO squads (coach_id, name) VALUES ($1, $2) RETURNING id',
        [userId, 'My Squad']
      );
    } catch (insertErr) {
      if (insertErr.code === '23505') {
        squadResult = await pool.query('SELECT id FROM squads WHERE coach_id = $1', [userId]);
      } else {
        throw insertErr;
      }
    }
  }

  return squadResult.rows[0].id;
}

module.exports = { getOrCreateUserId, getOwnedSquadId };
