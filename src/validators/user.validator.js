import { body } from "express-validator";

export const updateMyUserValidator = [
  body("full_name")
    .optional({ nullable: true })
    .trim()
    .isLength({ min: 3, max: 120 })
    .withMessage("full_name must be between 3 and 120 characters"),

  body("email")
    .optional({ nullable: true })
    .trim()
    .isEmail()
    .withMessage("email must be a valid email")
    .normalizeEmail(),

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
];
