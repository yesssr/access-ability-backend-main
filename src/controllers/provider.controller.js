import {
  createMyAvailability,
  getMyProviderCertifications,
  createMyProviderCertification,
  deleteMyProviderCertification,
  deleteMyAvailability,
  getMyProviderProfile,
  getProviderDetail,
  listServiceTypes,
  listProviders,
  removeMySpecialization,
  updateMyProviderCertification,
  updateMyAvailability,
  updateMyProviderProfile,
  upsertMySpecializations,
  verifyProviderProfile,
  verifyCertification,
} from "../services/provider.service.js";

export const getProviders = async (req, res, next) => {
  try {
    const data = await listProviders(req.query);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return next(err);
  }
};

export const getServiceTypes = async (req, res, next) => {
  try {
    const serviceTypes = await listServiceTypes();
    return res.status(200).json({
      success: true,
      data: { items: serviceTypes },
    });
  } catch (err) {
    return next(err);
  }
};

export const getProviderById = async (req, res, next) => {
  try {
    const provider = await getProviderDetail(req.params.id);
    return res.status(200).json({ success: true, data: { provider } });
  } catch (err) {
    return next(err);
  }
};

export const getProviderProfileByProviderId = async (req, res, next) => {
  try {
    const provider = await getProviderDetail(req.params.providerId);
    return res.status(200).json({ success: true, data: { provider } });
  } catch (err) {
    return next(err);
  }
};

export const getMyProvider = async (req, res, next) => {
  try {
    const userId = req.user?.sub || req.user?.id;
    const provider = await getMyProviderProfile(userId);
    return res.status(200).json({ success: true, data: { provider } });
  } catch (err) {
    return next(err);
  }
};

export const updateMyProvider = async (req, res, next) => {
  try {
    const userId = req.user?.sub || req.user?.id;
    const provider = await updateMyProviderProfile(userId, req.body);
    return res.status(200).json({
      success: true,
      message: "Provider profile updated",
      data: { provider },
    });
  } catch (err) {
    return next(err);
  }
};

export const addMySpecializations = async (req, res, next) => {
  try {
    const userId = req.user?.sub || req.user?.id;
    const specializations = await upsertMySpecializations(
      userId,
      req.body.service_type_ids
    );

    return res.status(200).json({
      success: true,
      message: "Specializations updated",
      data: { specializations },
    });
  } catch (err) {
    return next(err);
  }
};

export const deleteMySpecializationByServiceType = async (req, res, next) => {
  try {
    const userId = req.user?.sub || req.user?.id;
    await removeMySpecialization(userId, Number(req.params.serviceTypeId));

    return res.status(200).json({
      success: true,
      message: "Specialization removed",
    });
  } catch (err) {
    return next(err);
  }
};

export const addMyAvailability = async (req, res, next) => {
  try {
    const userId = req.user?.sub || req.user?.id;
    const availability = await createMyAvailability(userId, req.body);
    return res.status(201).json({
      success: true,
      message: "Availability created",
      data: { availability },
    });
  } catch (err) {
    return next(err);
  }
};

export const editMyAvailability = async (req, res, next) => {
  try {
    const userId = req.user?.sub || req.user?.id;
    const availability = await updateMyAvailability(
      userId,
      req.params.id,
      req.body
    );

    return res.status(200).json({
      success: true,
      message: "Availability updated",
      data: { availability },
    });
  } catch (err) {
    return next(err);
  }
};

export const addMyProviderCertificate = async (req, res, next) => {
  try {
    const userId = req.user?.sub || req.user?.id;
    const certification = await createMyProviderCertification(userId, req.file);

    return res.status(201).json({
      success: true,
      message: "Provider certificate added",
      data: { certification },
    });
  } catch (err) {
    return next(err);
  }
};

export const getMyProviderCertificates = async (req, res, next) => {
  try {
    const userId = req.user?.sub || req.user?.id;
    const certifications = await getMyProviderCertifications(userId);

    return res.status(200).json({
      success: true,
      data: { certifications },
    });
  } catch (err) {
    return next(err);
  }
};

export const editMyProviderCertificate = async (req, res, next) => {
  try {
    const userId = req.user?.sub || req.user?.id;
    const certification = await updateMyProviderCertification(
      userId,
      req.params.certificationId,
      req.file
    );

    return res.status(200).json({
      success: true,
      message: "Provider certificate updated",
      data: { certification },
    });
  } catch (err) {
    return next(err);
  }
};

export const removeMyProviderCertificate = async (req, res, next) => {
  try {
    const userId = req.user?.sub || req.user?.id;
    await deleteMyProviderCertification(userId, req.params.certificationId);

    return res.status(200).json({
      success: true,
      message: "Provider certificate removed",
    });
  } catch (err) {
    return next(err);
  }
};

export const removeMyAvailability = async (req, res, next) => {
  try {
    const userId = req.user?.sub || req.user?.id;
    await deleteMyAvailability(userId, req.params.id);

    return res.status(200).json({
      success: true,
      message: "Availability removed",
    });
  } catch (err) {
    return next(err);
  }
};

export const verifyProviderByAdmin = async (req, res, next) => {
  try {
    const adminUserId = req.user?.sub || req.user?.id;
    const provider = await verifyProviderProfile(
      req.params.id,
      adminUserId,
      req.body
    );

    return res.status(200).json({
      success: true,
      message: "Provider verification updated",
      data: { provider },
    });
  } catch (err) {
    return next(err);
  }
};

export const verifyCertificationByAdmin = async (req, res, next) => {
  try {
    const adminUserId = req.user?.sub || req.user?.id;
    const { certificationId } = req.params;
    const { is_verified } = req.body;

    if (typeof is_verified !== "boolean") {
      return res.status(422).json({
        success: false,
        message: "is_verified must be a boolean value",
      });
    }

    const updatedCertification = await verifyCertification(
      certificationId,
      adminUserId,
      is_verified
    );

    return res.status(200).json({
      success: true,
      message: "Certification verification updated",
      data: { certification: updatedCertification },
    });
  } catch (err) {
    return next(err);
  }
};
