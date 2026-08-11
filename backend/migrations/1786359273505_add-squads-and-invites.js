exports.up = (pgm) => {
  pgm.createTable('squads', {
    id: 'id',
    name: { type: 'varchar(255)', notNull: true, default: 'My Squad' },
    coach_id: { type: 'integer', notNull: true, references: 'users', onDelete: 'CASCADE' },
    created_at: { type: 'timestamp', default: pgm.func('now()') },
  });

  pgm.addConstraint('users', 'fk_users_squad', {
    foreignKeys: {
      columns: 'squad_id',
      references: 'squads(id)',
      onDelete: 'SET NULL',
    },
  });

  pgm.createTable('invites', {
    id: 'id',
    email: { type: 'varchar(255)', notNull: true },
    squad_id: { type: 'integer', notNull: true, references: 'squads', onDelete: 'CASCADE' },
    invited_by: { type: 'integer', notNull: true, references: 'users' },
    token: { type: 'varchar(255)', notNull: true, unique: true },
    status: { type: 'varchar(20)', notNull: true, default: 'pending' }, // pending | accepted | expired
    created_at: { type: 'timestamp', default: pgm.func('now()') },
  });
};

exports.down = (pgm) => {
  pgm.dropTable('invites');
  pgm.dropConstraint('users', 'fk_users_squad');
  pgm.dropTable('squads');
};
