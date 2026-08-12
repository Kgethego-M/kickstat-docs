exports.up = (pgm) => {
  pgm.addConstraint('squads', 'unique_coach_id', {
    unique: 'coach_id',
  });
};

exports.down = (pgm) => {
  pgm.dropConstraint('squads', 'unique_coach_id');
};
