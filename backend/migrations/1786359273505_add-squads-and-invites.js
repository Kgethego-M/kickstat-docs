exports.up = (pgm) => {
  // Idempotent: roster migrations may have already created these tables.
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS squads (
      id serial PRIMARY KEY,
      name varchar(255) NOT NULL DEFAULT 'My Squad',
      coach_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at timestamp DEFAULT now()
    );
  `);

  pgm.sql(`
    ALTER TABLE users
    ADD CONSTRAINT IF NOT EXISTS fk_users_squad
    FOREIGN KEY (squad_id) REFERENCES squads(id) ON DELETE SET NULL;
  `);

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
  pgm.sql('ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_users_squad;');
  pgm.sql('DROP TABLE IF EXISTS squads;');
};
