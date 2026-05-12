/*
Tujuan: Mendefinisikan endpoint device token FCM untuk client web/mobile.
Caller: routes/index.js saat mount /api/v1/devices.
Dependensi: auth middleware, validate middleware, device.validator, device.controller.
Main Functions: POST /register, POST /unregister, POST /test-notification.
Side Effects: Registrasi/unregister token DB dan pengiriman test notification via FCM.
*/

import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  registerDevice,
  sendTestNotification,
  unregisterDevice,
  unregisterAllDevices,
} from "../controllers/device.controller.js";
import {
  registerDeviceValidator,
  testNotificationValidator,
  unregisterDeviceValidator,
} from "../validators/device.validator.js";

const router = Router();

router.use(authenticate);

router.post("/register", registerDeviceValidator, validate, registerDevice);
router.post(
  "/unregister",
  unregisterDeviceValidator,
  validate,
  unregisterDevice
);
router.post(
  "/test-notification",
  testNotificationValidator,
  validate,
  sendTestNotification
);
router.post("/unregister-all", unregisterAllDevices);

export default router;
