exports.up = (pgm) => {
  pgm.addColumns('events', {
    title: { type: 'varchar(150)' },
    location: { type: 'varchar(255)' },
  });
};

exports.down = (pgm) => {
  pgm.dropColumns('events', ['title', 'location']);
};
