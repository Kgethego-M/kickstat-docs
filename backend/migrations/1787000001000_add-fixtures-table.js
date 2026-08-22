// Fixtures represent individual matches within a league or tournament.
// Each fixture links a home squad and an away squad, has its own kickoff time
// and status, and collects log entries just like a simple event does.
exports.up = (pgm) => {
  pgm.createTable('fixtures', {
    id: 'id',
    event_id: {
      type: 'integer',
      notNull: true,
      references: 'events',
      onDelete: 'CASCADE',
    },
    home_squad_id: {
      type: 'integer',
      notNull: true,
      references: 'squads',
      onDelete: 'CASCADE',
    },
    away_squad_id: {
      type: 'integer',
      notNull: true,
      references: 'squads',
      onDelete: 'CASCADE',
    },
    event_date: { type: 'timestamp' },
    status: { type: 'varchar(20)', notNull: true, default: 'scheduled' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('fixtures', 'event_id');
  pgm.createIndex('fixtures', 'home_squad_id');
  pgm.createIndex('fixtures', 'away_squad_id');
  pgm.createIndex('fixtures', 'status');
};

exports.down = (pgm) => {
  pgm.dropTable('fixtures');
};
