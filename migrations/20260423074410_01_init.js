/*
Tujuan: Inisialisasi skema database MVP ACCESS-ABILITY dari nol.
Caller: Knex migration runner.
Dependensi: PostgreSQL + extension pgcrypto.
Main Functions: up, down.
Side Effects: Membuat/menghapus tabel inti, enum, relasi FK, serta index performa query.
*/

export async function up(knex) {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');
  await knex.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_enum') THEN
        CREATE TYPE user_role_enum AS ENUM ('user', 'provider', 'admin');
      END IF;
    END
    $$;
  `);
  await knex.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'provider_verification_status_enum') THEN
        CREATE TYPE provider_verification_status_enum AS ENUM ('pending', 'approved', 'rejected');
      END IF;
    END
    $$;
  `);
  await knex.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_status_enum') THEN
        CREATE TYPE booking_status_enum AS ENUM ('pending', 'accepted', 'completed', 'cancelled');
      END IF;
    END
    $$;
  `);

  await knex.schema.createTable("users", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));

    table.string("email", 255).notNullable().unique();
    table.text("password_hash").notNullable();
    table.string("full_name", 120).notNullable();
    table.string("phone_number", 30).nullable();

    table.specificType("role", "user_role_enum").notNullable();

    table.boolean("is_active").notNullable().defaultTo(true);
    table.timestamp("last_login_at", { useTz: true }).nullable();

    table
      .timestamp("created_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
    table
      .timestamp("updated_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
  });

  await knex.schema.createTable("provider_profiles", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));

    table
      .uuid("user_id")
      .notNullable()
      .unique()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");

    table.text("bio").nullable();
    table.integer("years_experience").nullable();

    table.string("province_id", 8).notNullable();
    table.string("province_name", 120).notNullable();
    table.string("regency_id", 8).notNullable();
    table.string("regency_name", 140).notNullable();

    table.string("base_location_city", 100).notNullable();
    table.decimal("base_location_lat", 10, 7).nullable();
    table.decimal("base_location_lng", 10, 7).nullable();
    table.decimal("price_per_hour", 12, 2).notNullable();

    table.boolean("is_verified").notNullable().defaultTo(false);
    table
      .specificType("verification_status", "provider_verification_status_enum")
      .notNullable()
      .defaultTo("pending");

    table
      .uuid("verified_by")
      .nullable()
      .references("id")
      .inTable("users")
      .onDelete("SET NULL")
      .onUpdate("CASCADE");
    table.timestamp("verified_at", { useTz: true }).nullable();

    table.decimal("avg_rating", 3, 2).notNullable().defaultTo(0);
    table.integer("total_reviews").notNullable().defaultTo(0);

    table
      .timestamp("created_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
    table
      .timestamp("updated_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());

    table.check("years_experience IS NULL OR years_experience >= 0");
    table.check("price_per_hour > 0");
    table.check("avg_rating >= 0 AND avg_rating <= 5");
    table.check("total_reviews >= 0");
  });

  await knex.schema.createTable("service_types", (table) => {
    table.increments("id").primary();
    table.string("code", 50).notNullable().unique();
    table.string("name", 100).notNullable();
    table.text("description").nullable();

    table
      .timestamp("created_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
    table
      .timestamp("updated_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
  });

  await knex.schema.createTable("provider_specializations", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));

    table
      .uuid("provider_profile_id")
      .notNullable()
      .references("id")
      .inTable("provider_profiles")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");

    table
      .integer("service_type_id")
      .notNullable()
      .references("id")
      .inTable("service_types")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE");

    table
      .timestamp("created_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());

    table.unique(["provider_profile_id", "service_type_id"]);
  });

  await knex.schema.createTable("provider_certifications", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));

    table
      .uuid("provider_profile_id")
      .notNullable()
      .references("id")
      .inTable("provider_profiles")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");

    // MVP: sertifikat disimpan sebagai file gambar/url saja.
    table.text("file_url").notNullable();

    table.boolean("is_verified").notNullable().defaultTo(false);
    table
      .uuid("verified_by")
      .nullable()
      .references("id")
      .inTable("users")
      .onDelete("SET NULL")
      .onUpdate("CASCADE");
    table.timestamp("verified_at", { useTz: true }).nullable();

    table
      .timestamp("created_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
    table
      .timestamp("updated_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
  });

  await knex.schema.createTable("provider_availabilities", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));

    table
      .uuid("provider_profile_id")
      .notNullable()
      .references("id")
      .inTable("provider_profiles")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");

    table.smallint("day_of_week").notNullable();
    table.time("start_time").notNullable();
    table.time("end_time").notNullable();
    table.boolean("is_active").notNullable().defaultTo(true);

    table
      .timestamp("created_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
    table
      .timestamp("updated_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());

    table.check("day_of_week >= 0 AND day_of_week <= 6");
    table.check("start_time < end_time");
  });

  await knex.schema.createTable("bookings", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));

    table.string("booking_code", 30).notNullable().unique();

    table
      .uuid("user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE");

    table
      .uuid("provider_profile_id")
      .notNullable()
      .references("id")
      .inTable("provider_profiles")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE");

    table
      .integer("service_type_id")
      .notNullable()
      .references("id")
      .inTable("service_types")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE");

    table.date("booking_date").notNullable();
    table.time("start_time").notNullable();
    table.time("end_time").notNullable();
    table.decimal("duration_hours", 5, 2).notNullable();

    table.decimal("location_lat", 10, 7).nullable();
    table.decimal("location_lng", 10, 7).nullable();

    table.decimal("price_per_hour_snapshot", 12, 2).notNullable();
    table.decimal("price_estimate", 12, 2).notNullable();
    table.decimal("total_price", 12, 2).notNullable();

    table
      .specificType("status", "booking_status_enum")
      .notNullable()
      .defaultTo("pending");

    table.text("request_notes").nullable();
    table.text("cancel_reason").nullable();

    table.timestamp("accepted_at", { useTz: true }).nullable();
    table.timestamp("completed_at", { useTz: true }).nullable();
    table.timestamp("cancelled_at", { useTz: true }).nullable();

    table
      .timestamp("created_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
    table
      .timestamp("updated_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());

    table.check("start_time < end_time");
    table.check("duration_hours > 0");
    table.check("price_per_hour_snapshot > 0");
    table.check("price_estimate > 0");
    table.check("total_price > 0");
  });

  await knex.schema.createTable("booking_status_histories", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));

    table
      .uuid("booking_id")
      .notNullable()
      .references("id")
      .inTable("bookings")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");

    table.specificType("from_status", "booking_status_enum").nullable();

    table.specificType("to_status", "booking_status_enum").notNullable();

    table
      .uuid("changed_by")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE");

    table
      .timestamp("changed_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
    table.text("notes").nullable();
  });

  await knex.schema.createTable("reviews", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));

    table
      .uuid("booking_id")
      .notNullable()
      .unique()
      .references("id")
      .inTable("bookings")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");

    table
      .uuid("reviewer_user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE");

    table
      .uuid("provider_profile_id")
      .notNullable()
      .references("id")
      .inTable("provider_profiles")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");

    table.smallint("rating").notNullable();
    table.text("comment").nullable();

    table
      .timestamp("created_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
    table
      .timestamp("updated_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());

    table.check("rating >= 1 AND rating <= 5");
  });

  await knex.schema.createTable("ai_matching_logs", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));

    table
      .uuid("user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");

    table
      .integer("requested_service_type_id")
      .notNullable()
      .references("id")
      .inTable("service_types")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE");

    table.string("requested_regency_id", 8).nullable();
    table.string("requested_city", 100).nullable();
    table.date("requested_date").nullable();
    table.time("requested_start_time").nullable();
    table.decimal("requested_duration_hours", 5, 2).nullable();

    table
      .uuid("provider_profile_id")
      .notNullable()
      .references("id")
      .inTable("provider_profiles")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");

    table.decimal("score_total", 6, 4).notNullable();
    table.jsonb("score_breakdown").notNullable();

    table
      .timestamp("created_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());

    table.check(
      "requested_duration_hours IS NULL OR requested_duration_hours > 0"
    );
    table.check("score_total >= 0 AND score_total <= 1");
  });

  await knex.schema.alterTable("provider_profiles", (table) => {
    table.index(["is_verified"], "idx_provider_profiles_is_verified");
    table.index(["base_location_city"], "idx_provider_profiles_city");
    table.index(["price_per_hour"], "idx_provider_profiles_price");
    table.index(["province_id"], "idx_provider_profiles_province_id");
    table.index(["regency_id"], "idx_provider_profiles_regency_id");
    table.index(
      ["province_id", "regency_id"],
      "idx_provider_profiles_province_regency"
    );
  });

  await knex.schema.alterTable("provider_specializations", (table) => {
    table.index(
      ["service_type_id"],
      "idx_provider_specializations_service_type"
    );
  });

  await knex.schema.alterTable("provider_availabilities", (table) => {
    table.index(
      ["provider_profile_id", "day_of_week"],
      "idx_provider_availability_provider_day"
    );
    table.index(["is_active"], "idx_provider_availability_active");
  });

  await knex.schema.alterTable("bookings", (table) => {
    table.index(["user_id"], "idx_bookings_user");
    table.index(["provider_profile_id"], "idx_bookings_provider");
    table.index(["status"], "idx_bookings_status");
    table.index(["booking_date"], "idx_bookings_date");
    table.index(
      ["provider_profile_id", "booking_date", "start_time", "end_time"],
      "idx_bookings_provider_schedule"
    );
  });

  await knex.schema.alterTable("reviews", (table) => {
    table.index(["provider_profile_id"], "idx_reviews_provider");
    table.index(["rating"], "idx_reviews_rating");
  });

  await knex.schema.alterTable("ai_matching_logs", (table) => {
    table.index(["user_id"], "idx_ai_matching_logs_user");
    table.index(["provider_profile_id"], "idx_ai_matching_logs_provider");
    table.index(["created_at"], "idx_ai_matching_logs_created_at");
    table.index(
      ["requested_regency_id"],
      "idx_ai_matching_logs_requested_regency_id"
    );
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("ai_matching_logs");
  await knex.schema.dropTableIfExists("reviews");
  await knex.schema.dropTableIfExists("booking_status_histories");
  await knex.schema.dropTableIfExists("bookings");
  await knex.schema.dropTableIfExists("provider_availabilities");
  await knex.schema.dropTableIfExists("provider_certifications");
  await knex.schema.dropTableIfExists("provider_specializations");
  await knex.schema.dropTableIfExists("service_types");
  await knex.schema.dropTableIfExists("provider_profiles");
  await knex.schema.dropTableIfExists("users");

  await knex.raw("DROP TYPE IF EXISTS provider_verification_status_enum;");
  await knex.raw("DROP TYPE IF EXISTS booking_status_enum;");
  await knex.raw("DROP TYPE IF EXISTS user_role_enum;");
}
