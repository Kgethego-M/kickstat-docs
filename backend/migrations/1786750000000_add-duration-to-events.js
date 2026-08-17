exports.up = (pgm) => {
  pgm.addColumns('events', {
    duration_minutes: { type: 'integer', notNull: true, default: 90 },
  });
};

exports.down = (pgm) => {
  pgm.dropColumns('events', ['duration_minutes']);
};
