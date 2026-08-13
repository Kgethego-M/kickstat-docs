exports.up = (pgm) => {
  pgm.createTable('athletes', {
    id: 'id',
    squad_id: {
      type: 'integer',
      notNull: true,
      references: 'squads',
      onDelete: 'CASCADE',
    },
    name: { type: 'varchar(100)', notNull: true },
    position: { type: 'varchar(50)' },
    squad_number: { type: 'integer' },
    date_of_birth: { type: 'date' },
    contact_info: { type: 'varchar(255)' },
    created_at: { type: 'timestamp', default: pgm.func('now()') },
    updated_at: { type: 'timestamp', default: pgm.func('now()') },
  });
};

exports.down = (pgm) => {
  pgm.dropTable('athletes');
};
