exports.up = (pgm) => {
  pgm.createTable('events', {
    id: 'id',
    squad_id: {
      type: 'integer',
      notNull: true,
      references: 'squads',
      onDelete: 'CASCADE',
    },
    opponent: { type: 'varchar(100)' },
    // 'match' | 'training'
    event_type: { type: 'varchar(20)', notNull: true, default: 'match' },
    event_date: { type: 'timestamp', notNull: true },
    // 'scheduled' | 'live' | 'completed'
    status: { type: 'varchar(20)', notNull: true, default: 'scheduled' },
    created_by: {
      type: 'integer',
      notNull: true,
      references: 'users',
    },
    created_at: { type: 'timestamp', default: pgm.func('now()') },
    updated_at: { type: 'timestamp', default: pgm.func('now()') },
  });

  pgm.createIndex('events', 'squad_id');
  pgm.createIndex('events', 'status');
};

exports.down = (pgm) => {
  pgm.dropTable('events');
};
