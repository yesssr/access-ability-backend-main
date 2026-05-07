/*
Tujuan: Konfigurasi Knex untuk migrasi/seed lintas environment.
Caller: Knex CLI dan bootstrap DB aplikasi.
Dependensi: dotenv env vars (DATABASE_URL atau DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME/DB_SCHEMA).
Main Functions: export default konfigurasi knex per environment.
Side Effects: Menentukan target koneksi DB saat menjalankan migrasi/seed dan membuat schema target bila belum ada.
*/

import "dotenv/config";

const dbSchema = process.env.DB_SCHEMA || "public";
const dbSchemaEscaped = dbSchema.replace(/"/g, '""');

const connection = process.env.DATABASE_URL
  ? process.env.DATABASE_URL
  : {
      host: process.env.DB_HOST || "127.0.0.1",
      port: Number(process.env.DB_PORT || 5432),
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "access_ability",
      ssl: process.env.DB_SSL === "false" ? false : true,
    };

const base = {
  client: "pg",
  connection,
  searchPath: [dbSchema],
  pool: {
    min: Number(process.env.DB_POOL_MIN || 2),
    max: Number(process.env.DB_POOL_MAX || 10),
    afterCreate: (conn, done) => {
      conn.query(`CREATE SCHEMA IF NOT EXISTS "${dbSchemaEscaped}"`, (err) => {
        if (err) {
          done(err, conn);
          return;
        }

        conn.query(`SET search_path TO "${dbSchemaEscaped}"`, (searchPathErr) =>
          done(searchPathErr, conn)
        );
      });
    },
  },
  migrations: {
    directory: "./migrations",
    schemaName: dbSchema,
  },
  seeds: { directory: "./seeds" },
};

export default {
  development: base,
  test: { ...base },
  production: { ...base, pool: { min: 2, max: 20 } },
};
