/*
Tujuan: Validasi request domain provider (listing, update profil, availability, verifikasi).
Caller: providers.routes.
Dependensi: express-validator.
Main Functions: listProvidersValidator, updateMyProviderValidator, validator param/body provider lainnya.
Side Effects: Menolak request invalid (422) lewat middleware validate.
*/

import { body, param, query } from "express-validator";

const timePattern = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/;

export const listProvidersValidator = [
  query("province_id").optional().isLength({ min: 1, max: 8 }),
  query("regency_id").optional().isLength({ min: 1, max: 8 }),
  query("city").optional().trim().isLength({ min: 2, max: 100 }),
  query("service_type_id").optional().isInt({ min: 1 }),
  query("min_years_experience").optional().isInt({ min: 0 }),
  query("min_price").optional().isFloat({ min: 0 }),
  query("max_price").optional().isFloat({ min: 0 }),
  query("min_rating").optional().isFloat({ min: 0, max: 5 }),
  query("verified_only").optional().isBoolean(),
  query("available_date").optional().isISO8601().toDate(),
  query("start_time").optional().matches(timePattern),
  query("duration_hours").optional().isFloat({ gt: 0 }),
  query("sort")
    .optional()
    .isIn(["price_asc", "price_desc", "rating_desc", "reviews_desc"]),
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 50 }),
];

export const providerIdParamValidator = [
  param("id").isUUID().withMessage("provider id must be a valid UUID"),
];

export const providerIdParamAsProviderProfileValidator = [
  param("providerId")
    .isUUID()
    .withMessage("providerId must be a valid provider profile UUID"),
];

export const updateMyProviderValidator = [
  body("bio").optional({ nullable: true }).isLength({ max: 5000 }),
  body("years_experience").optional({ nullable: true }).isInt({ min: 0 }),
  body("province_id").optional().trim().isLength({ min: 1, max: 8 }),
  body("province_name").optional().trim().isLength({ min: 2, max: 120 }),
  body("regency_id").optional().trim().isLength({ min: 1, max: 8 }),
  body("regency_name").optional().trim().isLength({ min: 2, max: 140 }),
  body("base_location_city").optional().trim().isLength({ min: 2, max: 100 }),
  body("base_location_lat")
    .optional({ nullable: true })
    .isFloat({ min: -90, max: 90 }),
  body("base_location_lng")
    .optional({ nullable: true })
    .isFloat({ min: -180, max: 180 }),
  body("price_per_hour").optional().isFloat({ gt: 0 }),
];

export const upsertSpecializationValidator = [
  body("service_type_ids")
    .isArray({ min: 1 })
    .withMessage("service_type_ids must be a non-empty array"),
  body("service_type_ids.*")
    .isInt({ min: 1 })
    .withMessage("service_type_ids values must be positive integers"),
];

export const serviceTypeParamValidator = [
  param("serviceTypeId")
    .isInt({ min: 1 })
    .withMessage("serviceTypeId must be a positive integer"),
];

export const availabilityIdParamValidator = [
  param("id").isUUID().withMessage("availability id must be a valid UUID"),
];

export const createAvailabilityValidator = [
  body("day_of_week")
    .isInt({ min: 0, max: 6 })
    .withMessage("day_of_week must be between 0 and 6"),
  body("start_time")
    .notEmpty()
    .withMessage("start_time is required")
    .matches(timePattern)
    .withMessage("start_time must use HH:mm or HH:mm:ss"),
  body("end_time")
    .notEmpty()
    .withMessage("end_time is required")
    .matches(timePattern)
    .withMessage("end_time must use HH:mm or HH:mm:ss"),
  body("is_active").optional().isBoolean(),
  body("end_time")
    .custom((value, { req }) => {
      if (!req.body.start_time) return true;
      return value > req.body.start_time;
    })
    .withMessage("end_time must be greater than start_time"),
];

export const updateAvailabilityValidator = [
  body("day_of_week").optional().isInt({ min: 0, max: 6 }),
  body("start_time").optional().matches(timePattern),
  body("end_time").optional().matches(timePattern),
  body("is_active").optional().isBoolean(),
  body("end_time")
    .custom((value, { req }) => {
      if (!value || !req.body.start_time) return true;
      return value > req.body.start_time;
    })
    .withMessage("end_time must be greater than start_time"),
];

export const verifyProviderValidator = [
  body("verification_status")
    .notEmpty()
    .isIn(["approved", "rejected"])
    .withMessage("verification_status must be approved or rejected"),
];

export const createProviderCertificateValidator = [
  body("certificate_file").custom((value, { req }) => {
    if (!req.file) {
      throw new Error("certificate_file is required");
    }
    return true;
  }),
];

export const certificationIdParamValidator = [
  param("certificationId")
    .isUUID()
    .withMessage("certificationId must be a valid UUID"),
];
