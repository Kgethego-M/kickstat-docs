// Allows log entries to be attached to a specific fixture (league/tournament
// match) while still supporting simple events where fixture_id is null.
exports.up = (pgm) => {
  pgm.addColumn('log_entries', {
    fixture_id: {
      type: 'integer',
      references: 'fixtures',
      onDelete: 'CASCADE',
    },
  });

  pgm.createIndex('log_entries', 'fixture_id');
};

exports.down = (pgm) => {
  pgm.dropColumn('log_entries', 'fixture_id');
};
