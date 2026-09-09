exports.up = (pgm) => {
  pgm.alterColumn('events', 'created_by', { notNull: false });
};

exports.down = (pgm) => {
  pgm.alterColumn('events', 'created_by', { notNull: true });
};
