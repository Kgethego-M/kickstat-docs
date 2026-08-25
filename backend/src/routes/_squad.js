// Shared helpers for resolving/creating the logged-in user's user row and squad.

// Get (or lazily create) the internal users.id for a given Clerk user.
// Clerk's user.created webhook doesn't set role/squad anymore (see webhooks.js)
// — that's handled either by self-heal below (plain coach signup) or by
// POST /api/invites/:token/accept (assistant/athlete signup). Every route
// still calls this instead of assuming the row exists, since a brand-new
// user's very first request could arrive before either of those has run.
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

// Get (or lazily create) the squad_id for the logged-in user — coach,
// assistant, or athlete alike. Coaches resolve via squads.coach_id (with
// self-heal, same as before). Assistants and athletes are never a squad's
// coach_id, so for them this reads users.squad_id directly instead — that
// column is set once, at invite-accept time, and isn't something this
// function should try to recompute or override for non-coaches.
async function getOwnedSquadId(pool, clerkUserId) {
  const userId = await getOrCreateUserId(pool, clerkUserId);

  const userResult = await pool.query('SELECT role, squad_id FROM users WHERE id = $1', [userId]);
  const user = userResult.rows[0];

  if (!user) {
    throw new Error(`User row missing for ${clerkUserId}`);
  }

  if (user.role !== 'coach') {
    if (!user.squad_id) {
      const err = new Error('This account is not yet linked to a squad');
      err.status = 403;
      throw err;
    }
    return user.squad_id;
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

  // Keep users.squad_id in sync for coaches too, so every other read (this
  // function's own non-coach branch, future joins, etc.) can rely on one
  // consistent source instead of two different lookup paths per role.
  if (user.squad_id !== squadId) {
    await pool.query('UPDATE users SET squad_id = $1 WHERE id = $2', [squadId, userId]);
  }

  return squadId;
}

// Like getOwnedSquadId, but rejects non-coaches. Use for roster-management
// routes where only the head coach should write (US26).
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
