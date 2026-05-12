/*
Tujuan: Validasi request manajemen device token FCM.
Caller: devices.routes melalui validate middleware.
Dependensi: express-validator.
Main Functions: registerDeviceValidator, unregisterDeviceValidator, testNotificationValidator.
Side Effects: Tidak ada; hanya validasi input HTTP.
*/

import { body } from "express-validator";

const platformValidator = body("platform")
  .isIn(["web", "android", "ios"])
  .withMessage("platform must be one of: web, android, ios");

const tokenValidator = body("token")
  .trim()
  .isLength({ min: 20, max: 4096 })
  .withMessage("token length must be between 20 and 4096 characters");

export const registerDeviceValidator = [
  platformValidator,
  tokenValidator,
  body("metadata")
    .optional({ nullable: true })
    .isObject()
    .withMessage("metadata must be an object"),
];

export const unregisterDeviceValidator = [tokenValidator];

export const testNotificationValidator = [
  body("title")
    .optional()
    .trim()
    .isLength({ min: 1, max: 120 })
    .withMessage("title maximum length is 120 characters"),
  body("body")
    .optional()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage("body maximum length is 500 characters"),
];
