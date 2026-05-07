export async function seed(knex) {
  await knex("service_types").del();

  await knex("service_types").insert([
    {
      code: "sign_language_interpreter",
      name: "Juru Bahasa Isyarat",
      description:
        "Layanan interpretasi bahasa isyarat untuk komunikasi sehari-hari.",
    },
    {
      code: "mobility_assistant",
      name: "Pendamping Mobilitas",
      description:
        "Layanan pendampingan mobilitas untuk aktivitas di dalam/luar ruangan.",
    },
    {
      code: "transcriptor",
      name: "Transkriptor",
      description: "Layanan transkripsi percakapan, kelas, atau pertemuan.",
    },
  ]);
}
