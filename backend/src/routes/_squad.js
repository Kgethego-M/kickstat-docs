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
      if (retry.rows.length === 0) {
        throw new Error(`Race creating user for ${clerkUserId}: unique constraint hit but row missing`, { cause: insertErr });
      }
      return retry.rows[0].id;
    }
    throw insertErr;
  }
}

// Get the squad_id for the logged-in user.
// Coaches own their squad; assistants and athletes are linked to their coach's squad.
async function getOwnedSquadId(pool, clerkUserId) {
  const userId = await getOrCreateUserId(pool, clerkUserId);

  const userResult = await pool.query(
    'SELECT role, squad_id FROM users WHERE id = $1',
    [userId]
  );

  if (userResult.rows.length === 0) {
    throw new Error(`User row missing for ${clerkUserId}`);
  }

  const { role, squad_id: linkedSquadId } = userResult.rows[0];

  if (role === 'assistant' || role === 'athlete') {
    if (!linkedSquadId) {
      throw new Error(`Squad not linked for ${role} user ${clerkUserId}`);
    }
    return linkedSquadId;
  }

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

  if (!squadResult.rows[0]) {
    throw new Error(`Could not resolve squad for user ${clerkUserId}`, { cause: new Error('squad row missing after create/retry') });
  }

  const squadId = squadResult.rows[0].id;

  // Keep users.squad_id in sync for coaches as well.
  await pool.query(
    'UPDATE users SET squad_id = $1 WHERE id = $2 AND squad_id IS DISTINCT FROM $1',
    [squadId, userId]
  );

  return squadId;
}

// Like getOwnedSquadId, but rejects assistants. Use for roster-management
// routes where only the head coach should write.
async function getOwnedSquadIdForCoach(pool, clerkUserId) {
  const userId = await getOrCreateUserId(pool, clerkUserId);

  const userResult = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
  if (userResult.rows.length === 0) {
    throw new Error(`User row missing for ${clerkUserId}`);
  }

  if (userResult.rows[0].role !== 'coach') {
    const err = new Error('Only coaches can manage the roster');
    err.status = 403;
    throw err;
  }

  return getOwnedSquadId(pool, clerkUserId);
}

module.exports = { getOrCreateUserId, getOwnedSquadId, getOwnedSquadIdForCoach };
