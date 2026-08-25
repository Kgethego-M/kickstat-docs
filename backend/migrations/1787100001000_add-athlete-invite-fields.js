exports.up = (pgm) => {
  // The role/athlete_id columns on invites and the user_id column on athletes
  // were already added by earlier migrations (1787000000004 and 1787000000005)
  // on some branches. This migration only adds the email column on athletes
  // and the supporting indexes, safely skipping anything that already exists.
  pgm.sql(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'athletes' AND column_name = 'email'
      ) THEN
        ALTER TABLE athletes ADD COLUMN email varchar(255);
      END IF;
    END $$;
  `);

  pgm.sql(`CREATE INDEX IF NOT EXISTS athletes_user_id_idx ON athletes(user_id);`);
  pgm.sql(`CREATE INDEX IF NOT EXISTS invites_athlete_id_idx ON invites(athlete_id);`);
};

exports.down = (pgm) => {
  pgm.sql(`DROP INDEX IF EXISTS invites_athlete_id_idx;`);
  pgm.sql(`DROP INDEX IF EXISTS athletes_user_id_idx;`);
  pgm.sql(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'athletes' AND column_name = 'email'
      ) THEN
        ALTER TABLE athletes DROP COLUMN email;
      END IF;
    END $$;
  `);
};
