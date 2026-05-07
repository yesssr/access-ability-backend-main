import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  getMyMatchingHistoryHandler,
  getRecommendationsHandler,
} from "../controllers/matching.controller.js";
import {
  matchingHistoryQueryValidator,
  recommendationValidator,
} from "../validators/matching.validator.js";

const router = Router();

router.use(authenticate);

router.post(
  "/recommendations",
  recommendationValidator,
  validate,
  getRecommendationsHandler
);
router.get(
  "/history/me",
  matchingHistoryQueryValidator,
  validate,
  getMyMatchingHistoryHandler
);

export default router;
