exports.up = (pgm) => {
  pgm.createTable('invites', {
    id: 'id',
    email: { type: 'varchar(255)', notNull: true },
    squad_id: { type: 'integer', notNull: true, references: 'squads', onDelete: 'CASCADE' },
    invited_by: { type: 'integer', notNull: true, references: 'users' },
    token: { type: 'varchar(255)', notNull: true, unique: true },
    status: { type: 'varchar(20)', notNull: true, default: 'pending' },
    created_at: { type: 'timestamp', default: pgm.func('now()') },
  });
};

exports.down = (pgm) => {
  pgm.dropTable('invites');
};
