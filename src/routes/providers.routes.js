import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/role.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  getMyProviderCertificates,
  addMyProviderCertificate,
  addMyAvailability,
  addMySpecializations,
  deleteMySpecializationByServiceType,
  editMyProviderCertificate,
  editMyAvailability,
  getMyProvider,
  getServiceTypes,
  getProviderById,
  getProviderProfileByProviderId,
  getProviders,
  removeMyProviderCertificate,
  removeMyAvailability,
  updateMyProvider,
  verifyProviderByAdmin,
  verifyCertificationByAdmin,
} from "../controllers/provider.controller.js";
import { providerCertificateUploadMiddleware } from "../middlewares/provider-certificate-upload.middleware.js";
import {
  availabilityIdParamValidator,
  certificationIdParamValidator,
  createProviderCertificateValidator,
  createAvailabilityValidator,
  listProvidersValidator,
  providerIdParamValidator,
  providerIdParamAsProviderProfileValidator,
  serviceTypeParamValidator,
  updateAvailabilityValidator,
  updateMyProviderValidator,
  upsertSpecializationValidator,
  verifyProviderValidator,
} from "../validators/provider.validator.js";

const router = Router();

router.get("/", listProvidersValidator, validate, getProviders);
router.get("/service-types", getServiceTypes);
router.get(
  "/me/profile",
  authenticate,
  authorizeRoles("provider"),
  getMyProvider
);

router.get(
  "/:providerId/profile",
  providerIdParamAsProviderProfileValidator,
  validate,
  getProviderProfileByProviderId
);

router.put(
  "/me/profile",
  authenticate,
  authorizeRoles("provider"),
  updateMyProviderValidator,
  validate,
  updateMyProvider
);

router.post(
  "/me/specializations",
  authenticate,
  authorizeRoles("provider"),
  upsertSpecializationValidator,
  validate,
  addMySpecializations
);

router.delete(
  "/me/specializations/:serviceTypeId",
  authenticate,
  authorizeRoles("provider"),
  serviceTypeParamValidator,
  validate,
  deleteMySpecializationByServiceType
);

router.post(
  "/me/availabilities",
  authenticate,
  authorizeRoles("provider"),
  createAvailabilityValidator,
  validate,
  addMyAvailability
);

router.put(
  "/me/availabilities/:id",
  authenticate,
  authorizeRoles("provider"),
  availabilityIdParamValidator,
  updateAvailabilityValidator,
  validate,
  editMyAvailability
);

router.post(
  "/me/certifications",
  authenticate,
  authorizeRoles("provider"),
  providerCertificateUploadMiddleware,
  createProviderCertificateValidator,
  validate,
  addMyProviderCertificate
);

router.get(
  "/me/certifications",
  authenticate,
  authorizeRoles("provider"),
  getMyProviderCertificates
);

router.put(
  "/me/certifications/:certificationId",
  authenticate,
  authorizeRoles("provider"),
  certificationIdParamValidator,
  providerCertificateUploadMiddleware,
  createProviderCertificateValidator,
  validate,
  editMyProviderCertificate
);

router.delete(
  "/me/certifications/:certificationId",
  authenticate,
  authorizeRoles("provider"),
  certificationIdParamValidator,
  validate,
  removeMyProviderCertificate
);

router.delete(
  "/me/availabilities/:id",
  authenticate,
  authorizeRoles("provider"),
  availabilityIdParamValidator,
  validate,
  removeMyAvailability
);

router.patch(
  "/:id/verification",
  authenticate,
  authorizeRoles("admin"),
  providerIdParamValidator,
  verifyProviderValidator,
  validate,
  verifyProviderByAdmin
);

router.patch(
  "/certifications/:certificationId/verification",
  authenticate,
  authorizeRoles("admin"),
  certificationIdParamValidator,
  validate,
  verifyCertificationByAdmin
);

router.get("/:id", providerIdParamValidator, validate, getProviderById);

export default router;
