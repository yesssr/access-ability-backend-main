/*
Header: Push Subscriptions Table Migration
Tujuan: Menyimpan device/browser subscription tokens untuk Web Push, FCM, APNs.
Caller: Knex migration runner.
Dependensi: PostgreSQL.
Main Functions: up, down.
Side Effects: Membuat tabel push_subscriptions dengan index untuk fast query.
*/

export async function up(knex) {
  await knex.schema.createTable("push_subscriptions", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));

    table
      .uuid("user_id")
      .notNullable()
      .references("users.id")
      .onDelete("CASCADE");

    // Platform: 'web', 'android', 'ios'
    table.string("platform", 20).notNullable();

    // For web: full subscription object JSON
    // For mobile: FCM registration token / APNs token
    table.text("token").notNullable();

    // Optional: encryption keys for web push (p256dh, auth)
    table.jsonb("data").nullable();

    table
      .timestamp("created_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());

    table
      .timestamp("updated_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());

    // Composite index untuk fast lookup
    table.unique(["user_id", "platform", "token"]);
    table.index("user_id");
    table.index("platform");
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("push_subscriptions");
}
