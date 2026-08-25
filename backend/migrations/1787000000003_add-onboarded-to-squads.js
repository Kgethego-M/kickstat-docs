exports.up = (pgm) => {
  pgm.addColumns('squads', {
    // Set true once a coach finishes (or explicitly skips) the setup wizard.
    // Drives whether Dashboard redirects a coach into /setup.
    onboarded: { type: 'boolean', notNull: true, default: false },
  });
};

exports.down = (pgm) => {
  pgm.dropColumns('squads', ['onboarded']);
};
