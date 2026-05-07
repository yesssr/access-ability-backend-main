import { Router } from "express";
import {
  register,
  login,
  me,
  googleAuthUrl,
  googleCallback,
  googleMobileToken,
} from "../controllers/auth.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { registerUploadMiddleware } from "../middlewares/register-upload.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { authRateLimit } from "../middlewares/rate-limit.middleware.js";
import {
  registerValidator,
  loginValidator,
  googleMobileTokenValidator,
} from "../validators/auth.validator.js";

const router = Router();

// Traditional auth (username + password)
router.post(
  "/register",
  authRateLimit,
  registerUploadMiddleware,
  registerValidator,
  validate,
  register
);
router.post("/login", authRateLimit, loginValidator, validate, login);
router.get("/me", authenticate, me);

// OAuth Google (Web Flow)
router.get("/google/url", googleAuthUrl);
router.get("/google/callback", googleCallback);

// OAuth Google (Mobile Flow)
router.post(
  "/google/mobile",
  authRateLimit,
  googleMobileTokenValidator,
  validate,
  googleMobileToken
);

export default router;
