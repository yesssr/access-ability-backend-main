/*
Tujuan: Validasi request autentikasi dan registrasi.
Caller: auth.routes.
Dependensi: express-validator.
Main Functions: registerValidator, loginValidator.
Side Effects: Menolak request invalid (422) lewat middleware validate.
*/

import { body } from "express-validator";

export const registerValidator = [
  body("full_name")
    .trim()
    .notEmpty()
    .withMessage("full_name is required")
    .isLength({ min: 3, max: 120 })
    .withMessage("full_name must be between 3 and 120 characters"),

  body("email")
    .trim()
    .notEmpty()
    .withMessage("email is required")
    .isEmail()
    .withMessage("email must be a valid email")
    .normalizeEmail(),

  body("password")
    .notEmpty()
    .withMessage("password is required")
    .isLength({ min: 8, max: 72 })
    .withMessage("password must be between 8 and 72 characters"),

  body("phone")
    .optional({ nullable: true })
    .trim()
    .isLength({ min: 8, max: 30 })
    .withMessage("phone must be between 8 and 30 characters"),

  body("phone_number")
    .optional({ nullable: true })
    .trim()
    .isLength({ min: 8, max: 30 })
    .withMessage("phone_number must be between 8 and 30 characters"),

  body("role")
    .optional()
    .isIn(["user", "provider", "admin"])
    .withMessage("role must be one of: user, provider, admin"),

  body("province_id")
    .if(body("role").equals("provider"))
    .trim()
    .notEmpty()
    .withMessage("province_id is required for provider")
    .isLength({ min: 1, max: 8 })
    .withMessage("province_id must be a valid province id"),

  body("province_name")
    .if(body("role").equals("provider"))
    .trim()
    .notEmpty()
    .withMessage("province_name is required for provider")
    .isLength({ min: 2, max: 120 })
    .withMessage("province_name must be between 2 and 120 characters"),

  body("regency_id")
    .if(body("role").equals("provider"))
    .trim()
    .notEmpty()
    .withMessage("regency_id is required for provider")
    .isLength({ min: 1, max: 8 })
    .withMessage("regency_id must be a valid regency id"),

  body("regency_name")
    .if(body("role").equals("provider"))
    .trim()
    .notEmpty()
    .withMessage("regency_name is required for provider")
    .isLength({ min: 2, max: 140 })
    .withMessage("regency_name must be between 2 and 140 characters"),

  body("base_location_city")
    .if(body("role").equals("provider"))
    .trim()
    .notEmpty()
    .withMessage("base_location_city is required for provider")
    .isLength({ min: 2, max: 100 })
    .withMessage("base_location_city must be between 2 and 100 characters"),

  body("price_per_hour")
    .if(body("role").equals("provider"))
    .notEmpty()
    .withMessage("price_per_hour is required for provider")
    .isFloat({ gt: 0 })
    .withMessage("price_per_hour must be a number greater than 0"),

  body("provider_specialization")
    .if(body("role").equals("provider"))
    .isArray({ min: 1 })
    .withMessage(
      "provider_specialization is required for provider and must be a non-empty array"
    )
    .bail()
    .custom((value) => {
      if (!Array.isArray(value)) return false;
      const unique = new Set(value.map((v) => Number(v)));
      return unique.size === value.length;
    })
    .withMessage("provider_specialization must not contain duplicate IDs"),

  body("provider_specialization.*")
    .if(body("role").equals("provider"))
    .isInt({ min: 1 })
    .withMessage(
      "each provider_specialization item must be a valid service_type id"
    ),

  body("years_experience")
    .optional({ nullable: true })
    .isInt({ min: 0 })
    .withMessage(
      "years_experience must be an integer greater than or equal to 0"
    ),

  body("bio")
    .optional({ nullable: true })
    .isLength({ max: 5000 })
    .withMessage("bio must be at most 5000 characters"),
];

export const loginValidator = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("email is required")
    .isEmail()
    .withMessage("email must be a valid email")
    .normalizeEmail(),

  body("password").notEmpty().withMessage("password is required"),
];

/**
 * Validator untuk Google OAuth mobile token
 */
export const googleMobileTokenValidator = [
  body("idToken")
    .trim()
    .notEmpty()
    .withMessage("idToken is required")
    .isLength({ min: 10 })
    .withMessage("idToken must be a valid JWT token"),
];
