// AI assistance: drafted with Claude (Sonnet 5) via claude.ai; reviewed and tested by the project team.
exports.up = (pgm) => {
  pgm.addColumns('events', {
    reminder_sent: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
  });
};

exports.down = (pgm) => {
  pgm.dropColumns('events', ['reminder_sent']);
};
