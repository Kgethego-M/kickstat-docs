exports.up = (pgm) => {
  pgm.createTable('users', {
    id: 'id',
    clerk_id: { type: 'varchar(255)', notNull: true, unique: true },
    role: { type: 'varchar(20)', notNull: true, default: 'coach' },
    squad_id: { type: 'integer' },
    created_at: { type: 'timestamp', default: pgm.func('now()') },
  });
};

exports.down = (pgm) => {
  pgm.dropTable('users');
};
