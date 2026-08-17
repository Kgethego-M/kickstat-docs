// Restores the users.squad_id -> squads.id foreign key that existed in an
// earlier migration (add-squads-and-invites) before that file was replaced
// by add-invites-table. The column itself has existed since add-users-table;
// this just re-adds the integrity constraint and cascade behavior, which
// webhooks.js relies on implicitly (INSERT/UPDATE users.squad_id on
// assistant/coach signup).
exports.up = (pgm) => {
  pgm.addConstraint('users', 'fk_users_squad', {
    foreignKeys: {
      columns: 'squad_id',
      references: 'squads(id)',
      onDelete: 'SET NULL',
    },
  });
};

exports.down = (pgm) => {
  pgm.dropConstraint('users', 'fk_users_squad');
};
