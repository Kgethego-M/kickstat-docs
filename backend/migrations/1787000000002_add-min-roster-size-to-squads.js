exports.up = (pgm) => {
  pgm.addColumns('squads', {
    // A sport-configurable minimum, not hardcoded to soccer's 11 — a coach
    // could adjust this later for a different sport's squad size. Not
    // enforced as a hard block yet (US22's AC says "can optionally" gate
    // active status) — currently just drives the setup-progress prompt.
    min_roster_size: { type: 'integer', notNull: true, default: 11 },
  });
};

exports.down = (pgm) => {
  pgm.dropColumns('squads', ['min_roster_size']);
};
