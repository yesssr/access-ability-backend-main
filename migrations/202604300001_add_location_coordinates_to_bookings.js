/*
Tujuan: Menambahkan koordinat lokasi booking agar provider bisa membuka titik lokasi di maps.
Caller: Knex migration runner.
Dependensi: tabel bookings existing.
Main Functions: up, down.
Side Effects: Menambah/menghapus kolom location_lat dan location_lng pada bookings.
*/

export async function up(knex) {
  await knex.schema.alterTable("bookings", (table) => {
    table.decimal("location_lat", 10, 7).nullable();
    table.decimal("location_lng", 10, 7).nullable();
  });
}

export async function down(knex) {
  await knex.schema.alterTable("bookings", (table) => {
    table.dropColumn("location_lat");
    table.dropColumn("location_lng");
  });
}
