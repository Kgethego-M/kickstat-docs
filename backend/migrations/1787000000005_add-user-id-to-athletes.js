exports.up = (pgm) => {
  pgm.addColumns('athletes', {
    // set once an invited athlete accepts their invite and creates an
    // account — links this existing roster row (and all its stats history)
    // to their login, rather than creating a second disconnected record
    user_id: { type: 'integer', references: 'users', onDelete: 'SET NULL' },
  });
};

exports.down = (pgm) => {
  pgm.dropColumns('athletes', ['user_id']);
};
