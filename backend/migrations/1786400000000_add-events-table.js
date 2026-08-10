exports.up = (pgm) => {
  pgm.createTable('events', {
    id: 'id',
    squad_id: {
      type: 'integer',
      notNull: true,
      references: 'squads',
      onDelete: 'CASCADE',
    },
    type: { type: 'varchar(20)', notNull: true },
    title: { type: 'varchar(255)', notNull: true },
    event_date: { type: 'date', notNull: true },
    event_time: { type: 'time', notNull: true },
    location: { type: 'varchar(255)', notNull: true },
    status: { type: 'varchar(20)', notNull: true, default: 'scheduled' },
    created_at: { type: 'timestamp', default: pgm.func('now()') },
    updated_at: { type: 'timestamp', default: pgm.func('now()') },
  });
};

exports.down = (pgm) => {
  pgm.dropTable('events');
};