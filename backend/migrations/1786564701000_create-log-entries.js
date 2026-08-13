exports.up = (pgm) => {
  pgm.createTable('log_entries', {
    id: 'id',
    event_id: {
      type: 'integer',
      notNull: true,
      references: 'events',
      onDelete: 'CASCADE',
    },
    // null athlete_id = action logged against/for the opponent (e.g. their goal)
    athlete_id: {
      type: 'integer',
      references: 'athletes',
      onDelete: 'SET NULL',
    },
    // 'goal' | 'point' | 'penalty' | 'yellow_card' | 'red_card' | 'substitution' | ...
    action_type: { type: 'varchar(30)', notNull: true },
    is_scoring: { type: 'boolean', notNull: true, default: false },
    value: { type: 'integer', notNull: true, default: 1 },
    minute: { type: 'integer' },
    notes: { type: 'varchar(255)' },
    logged_by: {
      type: 'integer',
      notNull: true,
      references: 'users',
    },
    logged_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamp', default: pgm.func('now()') },
    // soft delete — this IS the "undo" from US14, keeps a full audit trail
    deleted_at: { type: 'timestamp' },
  });

  pgm.createIndex('log_entries', 'event_id');
  pgm.createIndex('log_entries', 'athlete_id');
};

exports.down = (pgm) => {
  pgm.dropTable('log_entries');
};
