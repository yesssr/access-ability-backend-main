/*
Tujuan: Validasi request booking.
Caller: booking.routes melalui validate middleware.
Dependensi: express-validator.
Main Functions: createBookingValidator, listMyBookingsValidator, cancelBookingValidator.
*/

import { body, param, query } from "express-validator";

const timePattern = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/;

export const bookingIdParamValidator = [
  param("id").isUUID().withMessage("booking id must be a valid UUID"),
];

export const createBookingValidator = [
  body("provider_profile_id")
    .notEmpty()
    .withMessage("provider_profile_id is required")
    .isUUID()
    .withMessage("provider_profile_id must be a UUID"),
  body("service_type_id")
    .notEmpty()
    .withMessage("service_type_id is required")
    .isInt({ min: 1 })
    .withMessage("service_type_id must be a positive integer"),
  body("booking_date")
    .notEmpty()
    .withMessage("booking_date is required")
    .isISO8601()
    .withMessage("booking_date must be a valid date"),
  body("start_time")
    .notEmpty()
    .withMessage("start_time is required")
    .matches(timePattern)
    .withMessage("start_time must use HH:mm or HH:mm:ss"),
  body("end_time")
    .notEmpty()
    .withMessage("end_time is required")
    .matches(timePattern)
    .withMessage("end_time must use HH:mm or HH:mm:ss")
    .custom((value, { req }) => {
      if (!req.body.start_time) return true;
      return value !== req.body.start_time;
    })
    .withMessage("end_time must be different from start_time"),
  body("location_lat")
    .notEmpty()
    .withMessage("location_lat is required")
    .isFloat({ min: -90, max: 90 })
    .withMessage("location_lat must be a valid latitude"),
  body("location_lng")
    .notEmpty()
    .withMessage("location_lng is required")
    .isFloat({ min: -180, max: 180 })
    .withMessage("location_lng must be a valid longitude"),
  body("request_notes")
    .optional({ nullable: true })
    .isLength({ max: 5000 })
    .withMessage("request_notes maximum length is 5000 characters"),
];

export const listMyBookingsValidator = [
  query("status")
    .optional()
    .custom((value) => {
      // Support both: "pending" atau "pending,accepted" atau array ["pending", "accepted"]
      const statuses = Array.isArray(value)
        ? value
        : String(value)
            .split(",")
            .filter((s) => s.trim());

      const validStatuses = ["pending", "accepted", "completed", "cancelled"];
      const isValid = statuses.every((s) => validStatuses.includes(s.trim()));

      if (!isValid) {
        throw new Error(
          "status must be one of: pending, accepted, completed, cancelled"
        );
      }
      return true;
    }),
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 50 }),
];

export const cancelBookingValidator = [
  body("cancel_reason")
    .optional({ nullable: true })
    .isLength({ max: 2000 })
    .withMessage("cancel_reason maximum length is 2000 characters"),
];
