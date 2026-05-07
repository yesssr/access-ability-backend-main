/*
Tujuan: Mendefinisikan endpoint user self-service.
Caller: src/routes/index.js di mount /api/v1/users.
Dependensi: auth middleware, validation middleware, upload middleware, user controller.
Main Functions: PATCH /me untuk update profil user dan upload foto profil.
Side Effects: Menjalankan otentikasi, parsing multipart, validasi payload, dan update data user.
*/

import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { userProfileUploadMiddleware } from "../middlewares/user-profile-upload.middleware.js";
import { updateMyUser } from "../controllers/user.controller.js";
import { updateMyUserValidator } from "../validators/user.validator.js";

const router = Router();

router.patch(
  "/me",
  authenticate,
  userProfileUploadMiddleware,
  updateMyUserValidator,
  validate,
  updateMyUser
);

export default router;
