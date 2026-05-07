/*
Tujuan: Mendaftarkan seluruh endpoint API v1 dan mengatur aktivasi fitur berbasis flag.
Caller: src/app.js saat mount router utama /api/v1.
Dependensi: router domain route modules dan konfigurasi env.
Main Functions: export default router.
Side Effects: Mengaktifkan/menonaktifkan akses endpoint tertentu (contoh: matching) sesuai feature flag.
*/

import { Router } from "express";
import { health } from "../controllers/health.controller.js";
import { env } from "../config/env.js";
import authRoutes from "./auth.routes.js";
import providerRoutes from "./providers.routes.js";
import usersRoutes from "./users.routes.js";
import bookingRoutes from "./bookings.routes.js";
import reviewRoutes from "./reviews.routes.js";
import matchingRoutes from "./matching.routes.js";
import locationRoutes from "./locations.routes.js";
import pushRoutes from "./push.routes.js";
import { getServiceTypes } from "../controllers/provider.controller.js";

const router = Router();

router.get("/health", health);
router.get("/service-types", getServiceTypes);
router.use("/auth", authRoutes);
router.use("/providers", providerRoutes);
router.use("/users", usersRoutes);
router.use("/bookings", bookingRoutes);
router.use("/reviews", reviewRoutes);
router.use("/push", pushRoutes);

if (env.features.enableAiMatching) {
  router.use("/matching", matchingRoutes);
} else {
  router.use("/matching", (req, res) => {
    return res.status(503).json({
      success: false,
      message: "AI matching feature is disabled for MVP",
    });
  });
}

router.use("/locations", locationRoutes);

export default router;
