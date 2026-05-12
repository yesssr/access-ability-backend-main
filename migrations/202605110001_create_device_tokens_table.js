/*
Tujuan: Menyediakan tabel token FCM per user/device untuk push notification web dan mobile.
Caller: Knex migration runner saat setup/update database.
Dependensi: PostgreSQL, tabel users, dan extension pgcrypto dari migration awal.
Main Functions: up, down.
Side Effects: Membuat/menghapus tabel device_tokens beserta index lookup user/token aktif.
*/

export async function up(knex) {
  const exists = await knex.schema.hasTable("device_tokens");
  if (exists) {
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
