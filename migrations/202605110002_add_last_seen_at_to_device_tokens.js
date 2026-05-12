/*
Tujuan: Menambahkan kolom last_seen_at pada tabel device_tokens untuk kompatibilitas schema push token.
Caller: Knex migration runner saat update database.
Dependensi: PostgreSQL, tabel device_tokens.
Main Functions: up, down.
Side Effects: Menambah kolom last_seen_at (dengan backfill) jika belum ada.
*/

export async function up(knex) {
  const hasTable = await knex.schema.hasTable("device_tokens");
  if (!hasTable) return;

  const hasLastSeenAt = await knex.schema.hasColumn(
    "device_tokens",
    "last_seen_at"
  );

  if (!hasLastSeenAt) {
    await knex.schema.alterTable("device_tokens", (table) => {
      table.timestamp("last_seen_at", { useTz: true }).nullable();
    });

    await knex("device_tokens").update({
      last_seen_at: knex.fn.now(),
    });

    await knex.schema.alterTable("device_tokens", (table) => {
      table.timestamp("last_seen_at", { useTz: true }).notNullable().alter();
    });
  }
}

export async function down(knex) {
  const hasTable = await knex.schema.hasTable("device_tokens");
  if (!hasTable) return;

  const hasLastSeenAt = await knex.schema.hasColumn(
    "device_tokens",
    "last_seen_at"
  );

  if (hasLastSeenAt) {
    await knex.schema.alterTable("device_tokens", (table) => {
      table.dropColumn("last_seen_at");
    });
  }
}
