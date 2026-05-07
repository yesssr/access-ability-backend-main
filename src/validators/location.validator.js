import { param, query } from "express-validator";

export const listLocationsQueryValidator = [
  query("search").optional().trim().isLength({ min: 1, max: 120 }),
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 500 }),
];

export const provinceIdParamValidator = [
  param("provinceId").trim().isLength({ min: 1, max: 8 }),
];
