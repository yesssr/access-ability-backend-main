/*
Tujuan: (Restorative) Migration placeholder yang hilang.
Alasan: Knex mencatat migrasi ini sudah dijalankan tetapi file hilang di direktori --
menambahkan file ini sebagai "no-op if exists" sehingga migrasi dapat tervalidasi
tanpa mengubah struktur yang sudah ada.
Caller: Knex migration runner.
Main Functions: up, down.
*/

export async function up(knex) {
  const exists = await knex.schema.hasTable("device_tokens");
  if (exists) {
    // Tabel sudah ada (mungkin dibuat manual atau oleh migrasi lain).
    // Catat: tidak melakukan perubahan schema untuk menghindari konflik.
    return;
  }

  await knex.schema.createTable("device_tokens", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));

    table
      .uuid("user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");

    table.string("platform", 20).notNullable();
    table.text("token").notNullable();
    table.jsonb("metadata").nullable();
    table.boolean("is_active").notNullable().defaultTo(true);
    table.timestamp("last_seen_at", { useTz: true }).notNullable();

    table
      .timestamp("created_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
    table
      .timestamp("updated_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());

    table.unique(["token"]);
    table.index(["user_id", "is_active"]);
    table.index(["platform", "is_active"]);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("device_tokens");
}
