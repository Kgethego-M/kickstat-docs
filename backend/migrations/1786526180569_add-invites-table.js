exports.up = (pgm) => {
  // Idempotent: the invites table may already have been created by an earlier migration.
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS invites (
      id serial PRIMARY KEY,
      email varchar(255) NOT NULL,
      squad_id integer NOT NULL REFERENCES squads(id) ON DELETE CASCADE,
      invited_by integer NOT NULL REFERENCES users(id),
      token varchar(255) NOT NULL UNIQUE,
      status varchar(20) NOT NULL DEFAULT 'pending',
      created_at timestamp DEFAULT now()
    );
  `);
};

exports.down = (pgm) => {
  pgm.sql('DROP TABLE IF EXISTS invites;');
};
