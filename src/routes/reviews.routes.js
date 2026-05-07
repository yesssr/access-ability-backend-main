import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  createReviewHandler,
  getMyReviewsHandler,
  getProviderReviewsHandler,
} from "../controllers/review.controller.js";
import {
  createReviewValidator,
  providerReviewsParamValidator,
  reviewListQueryValidator,
} from "../validators/review.validator.js";

const router = Router();

router.get(
  "/providers/:providerId/reviews",
  providerReviewsParamValidator,
  reviewListQueryValidator,
  validate,
  getProviderReviewsHandler
);

router.post(
  "/",
  authenticate,
  createReviewValidator,
  validate,
  createReviewHandler
);
router.get(
  "/me",
  authenticate,
  reviewListQueryValidator,
  validate,
  getMyReviewsHandler
);

export default router;
