/*
Tujuan: Melonggarkan constraint password_hash agar user OAuth dapat disimpan tanpa password lokal.
Caller: Knex migration runner.
Dependensi: Tabel users sudah ada dari migration awal.
Main Functions: up, down.
Side Effects: Mengubah nullability kolom users.password_hash.
*/

export async function up(knex) {
  await knex.schema.alterTable("users", (table) => {
    table.text("password_hash").nullable().alter();
  });
}

export async function down(knex) {
  await knex.raw(`
    UPDATE users
    SET password_hash = ''
    WHERE password_hash IS NULL;
  `);

  await knex.schema.alterTable("users", (table) => {
    table.text("password_hash").notNullable().alter();
  });
}
