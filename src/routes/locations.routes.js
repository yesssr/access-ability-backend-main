import { Router } from "express";
import { validate } from "../middlewares/validate.middleware.js";
import {
  getProvincesHandler,
  getRegenciesByProvinceHandler,
} from "../controllers/location.controller.js";
import {
  listLocationsQueryValidator,
  provinceIdParamValidator,
} from "../validators/location.validator.js";

const router = Router();

router.get(
  "/provinces",
  listLocationsQueryValidator,
  validate,
  getProvincesHandler
);
router.get(
  "/provinces/:provinceId/regencies",
  provinceIdParamValidator,
  listLocationsQueryValidator,
  validate,
  getRegenciesByProvinceHandler
);

export default router;
