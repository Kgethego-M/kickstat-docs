exports.up = (pgm) => {
  pgm.addColumns('invites', {
    // 'assistant' | 'athlete' — defaults to 'assistant' to match every invite
    // created before this migration existed
    role: { type: 'varchar(20)', notNull: true, default: 'assistant' },
    // only set when role = 'athlete' — links this invite to a specific
    // pre-existing roster row so accepting it attaches to real stats history
    // instead of creating a disconnected account
    athlete_id: { type: 'integer', references: 'athletes', onDelete: 'SET NULL' },
  });
};

exports.down = (pgm) => {
  pgm.dropColumns('invites', ['role', 'athlete_id']);
};
