/*
Header: Push Notification Routes
Tujuan: Mendaftarkan endpoint push subscription dan testing.
Caller: src/routes/index.js.
Dependensi: push.controller, auth middleware.
Main Functions: POST subscribe, POST send-test.
Side Effects: Route registration.
*/

import { Router } from "express";
import { subscribe, sendTest } from "../controllers/push.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = Router();

// POST /api/v1/push/subscribe - Register device subscription
router.post("/subscribe", authenticate, subscribe);

// POST /api/v1/push/send-test - Send test notification (dev only)
router.post("/send-test", authenticate, sendTest);

export default router;
