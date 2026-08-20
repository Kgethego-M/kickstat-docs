// Adds multi-team event support: an event can be a simple match/training or a
// league/tournament that many squads join. The creator's squad is automatically
// added as the first participant via the application layer.
exports.up = (pgm) => {
  pgm.addColumn('events', {
    format: { type: 'varchar(20)', notNull: true, default: 'match' },
    required_teams: { type: 'integer' },
  });

  pgm.createTable('event_teams', {
    id: 'id',
    event_id: {
      type: 'integer',
      notNull: true,
      references: 'events',
      onDelete: 'CASCADE',
    },
    squad_id: {
      type: 'integer',
      notNull: true,
      references: 'squads',
      onDelete: 'CASCADE',
    },
    role: { type: 'varchar(20)', notNull: true, default: 'participant' },
    seed_order: { type: 'integer' },
    joined_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
  });

  pgm.addConstraint('event_teams', 'unique_event_squad', {
    unique: ['event_id', 'squad_id'],
  });

  pgm.createIndex('event_teams', 'event_id');
  pgm.createIndex('event_teams', 'squad_id');
};

exports.down = (pgm) => {
  pgm.dropTable('event_teams');
  pgm.dropColumn('events', 'format');
  pgm.dropColumn('events', 'required_teams');
};
