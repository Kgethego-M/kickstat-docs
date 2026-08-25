exports.up = (pgm) => {
  pgm.addColumn('athletes', {
    email: { type: 'varchar(255)' },
    user_id: {
      type: 'integer',
      references: 'users',
      onDelete: 'SET NULL',
    },
  });

  pgm.addColumn('invites', {
    role: { type: 'varchar(20)', notNull: true, default: 'assistant' },
    athlete_id: {
      type: 'integer',
      references: 'athletes',
      onDelete: 'SET NULL',
    },
  });

  pgm.createIndex('athletes', 'user_id');
  pgm.createIndex('invites', 'athlete_id');
};

exports.down = (pgm) => {
  pgm.dropColumn('invites', 'athlete_id');
  pgm.dropColumn('invites', 'role');
  pgm.dropColumn('athletes', 'user_id');
  pgm.dropColumn('athletes', 'email');
};
