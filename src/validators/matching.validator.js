import { body, query } from "express-validator";

const timePattern = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/;

export const recommendationValidator = [
  body("requested_service_type_id")
    .notEmpty()
    .withMessage("requested_service_type_id is required")
    .isInt({ min: 1 })
    .withMessage("requested_service_type_id must be a positive integer"),
  body("requested_regency_id")
    .optional({ nullable: true })
    .trim()
    .isLength({ min: 1, max: 8 })
    .withMessage("requested_regency_id must be a valid regency id"),
  body("requested_city")
    .optional({ nullable: true })
    .trim()
    .isLength({ min: 2, max: 100 }),
  body("requested_date").optional({ nullable: true }).isISO8601(),
  body("requested_start_time")
    .optional({ nullable: true })
    .matches(timePattern)
    .withMessage("requested_start_time must use HH:mm or HH:mm:ss"),
  body("requested_duration_hours")
    .optional({ nullable: true })
    .isFloat({ gt: 0 })
    .withMessage("requested_duration_hours must be greater than 0"),
  body("budget_max")
    .optional({ nullable: true })
    .isFloat({ gt: 0 })
    .withMessage("budget_max must be greater than 0"),
  body("top_n").optional().isInt({ min: 1, max: 20 }),
];

export const matchingHistoryQueryValidator = [
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 50 }),
];
