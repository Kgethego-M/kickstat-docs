exports.up = (pgm) => {
  pgm.createTable('squads', {
    id: 'id',
    coach_id: {
      type: 'integer',
      notNull: true,
      references: 'users',
      onDelete: 'CASCADE',
    },
    name: { type: 'varchar(100)', notNull: true },
    created_at: { type: 'timestamp', default: pgm.func('now()') },
  });
};

exports.down = (pgm) => {
  pgm.dropTable('squads');
};