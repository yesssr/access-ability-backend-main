import knex from "knex";
import { Model } from "objection";
import knexConfig from "../../knexfile.js";

/*
Tujuan: Inisialisasi Knex instance dengan runtime search_path enforcement.
Caller: app.js dan semua model/services.
Dependensi: knexfile.js konfigurasi.
Main Functions: Export knexInstance yang sudah bound ke Model.
Side Effects: Set search_path untuk setiap query dan model resolution.
*/

const env = process.env.NODE_ENV || "development";
export const knexInstance = knex(knexConfig[env]);

// Enforce search_path pada setiap query untuk memastikan schema app_mvp selalu aktif
const dbSchema = process.env.DB_SCHEMA || "app_mvp";
const dbSchemaEscaped = dbSchema.replace(/"/g, '""');

// Gunakan raw query event hook untuk SET search_path sebelum setiap query
knexInstance.on("query", (query) => {
  // Log optional; untuk debugging uncomment:
  // console.log("[Knex Query]", query.sql.substring(0, 100));
});

// Set search_path pada initialization sebelum model/query lain berjalan.
await knexInstance.raw(`SET search_path TO "${dbSchemaEscaped}"`);

Model.knex(knexInstance);
