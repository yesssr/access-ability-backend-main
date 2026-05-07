/*
Tujuan: Menambahkan field OAuth ke tabel users untuk mendukung login Google dan provider OAuth lainnya.
Caller: Knex migration runner.
Dependensi: PostgreSQL, tabel users sudah ada.
Main Functions: up, down.
Side Effects: Modifikasi tabel users dengan kolom google_id, oauth_provider, oauth_token_data.
*/

export async function up(knex) {
  // Alter existing password_hash to nullable untuk OAuth users
  await knex.schema.alterTable("users", (table) => {
    table.string("google_id", 255).nullable().unique();
    table.string("oauth_provider", 50).nullable(); // 'google', 'etc'
    table.jsonb("oauth_token_data").nullable(); // Menyimpan refresh token dan metadata OAuth
  });
}

export async function down(knex) {
  await knex.schema.alterTable("users", (table) => {
    table.dropColumn("google_id");
    table.dropColumn("oauth_provider");
    table.dropColumn("oauth_token_data");
  });
}
