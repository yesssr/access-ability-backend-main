import { body, param, query } from "express-validator";

export const createReviewValidator = [
  body("booking_id")
    .notEmpty()
    .withMessage("booking_id is required")
    .isUUID()
    .withMessage("booking_id must be a valid UUID"),
  body("rating")
    .notEmpty()
    .withMessage("rating is required")
    .isInt({ min: 1, max: 5 })
    .withMessage("rating must be between 1 and 5"),
  body("comment")
    .optional({ nullable: true })
    .isLength({ max: 5000 })
    .withMessage("comment maximum length is 5000 characters"),
];

export const providerReviewsParamValidator = [
  param("providerId").isUUID().withMessage("providerId must be a valid UUID"),
];

export const reviewListQueryValidator = [
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 50 }),
];
