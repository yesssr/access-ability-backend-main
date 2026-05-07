/*
Tujuan: Menambahkan kolom image_url pada tabel users untuk menyimpan URL foto profil.
Caller: Knex migration runner.
Dependensi: Tabel users sudah ada.
Main Functions: up, down.
Side Effects: Menambah/menghapus kolom image_url di users.
*/

export async function up(knex) {
  const hasColumn = await knex.schema.hasColumn("users", "image_url");
  if (!hasColumn) {
    await knex.schema.alterTable("users", (table) => {
      table.text("image_url").nullable();
    });
  }
}

export async function down(knex) {
  const hasColumn = await knex.schema.hasColumn("users", "image_url");
  if (hasColumn) {
    await knex.schema.alterTable("users", (table) => {
      table.dropColumn("image_url");
    });
  }
}
