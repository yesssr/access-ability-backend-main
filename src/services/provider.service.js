/*
Tujuan: Menjalankan use case domain provider (listing, profil, spesialisasi, availability, verifikasi, push notifikasi).
Caller: controller provider.
Dependensi: model Provider, ProviderSpecialization, ProviderAvailability, ServiceType, push.service, notification.templates.
Main Functions: listProviders, getProviderDetail, getMyProviderProfile, updateMyProviderProfile, upsertMySpecializations, removeMySpecialization, createMyAvailability, updateMyAvailability, deleteMyAvailability, verifyProviderProfile, verifyCertification.
Side Effects: DB read/write pada provider_profiles, provider_specializations, provider_availabilities, device_tokens. Push notifications FCM dikirim ke provider saat provider disetujui dan saat sertifikat diverifikasi.
*/

import { Provider } from "../models/Provider.js";
import { ProviderSpecialization } from "../models/ProviderSpecialization.js";
import { ProviderAvailability } from "../models/ProviderAvailability.js";
import { ProviderCertification } from "../models/ProviderCertification.js";
import { ServiceType } from "../models/ServiceType.js";
import { uploadFileToStorage } from "./storage.service.js";
import { env } from "../config/env.js";
import { sendNotificationToUser } from "./push.service.js";
import {
  buildCertificationVerificationNotification,
  buildProviderVerificationNotification,
} from "./notification.templates.js";

const makeError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

const parsePagination = (page, limit) => {
  const currentPage = Math.max(Number(page) || 1, 1);
  const perPage = Math.min(Math.max(Number(limit) || 10, 1), 50);
  return { currentPage, perPage };
};

const parseBoolean = (value) => {
  if (value === undefined) return undefined;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;
  }
  return undefined;
};

const parseTimeToSeconds = (time) => {
  const [h, m, s = "0"] = String(time).split(":");
  return Number(h) * 3600 + Number(m) * 60 + Number(s);
};

const formatSecondsToTime = (value) => {
  const hours = Math.floor(value / 3600)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor((value % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor(value % 60)
    .toString()
    .padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
};

const buildEndTime = (startTime, durationHours) => {
  const startSeconds = parseTimeToSeconds(startTime);
  const durationSeconds = Math.round(Number(durationHours) * 3600);
  return formatSecondsToTime(startSeconds + durationSeconds);
};

const findProviderByUserId = async (userId) => {
  const provider = await Provider.query().findOne({ user_id: userId });
  if (!provider) {
    throw makeError(404, "Provider profile not found");
  }
  return provider;
};

const findProviderById = async (providerId) => {
  const provider = await Provider.query().findById(providerId);
  if (!provider) {
    throw makeError(404, "Provider profile not found");
  }
  return provider;
};

const sanitizeProviderGraph = (provider) => {
  if (!provider) return provider;

  const safeProvider = { ...provider };

  if (safeProvider.user) {
    const { password_hash, ...safeUser } = safeProvider.user;
    safeProvider.user = safeUser;
  }

  return safeProvider;
};

const hydrateServiceTypes = async (providers) => {
  const providerList = Array.isArray(providers) ? providers : [providers];
  const serviceTypeIds = [
    ...new Set(
      providerList.flatMap((provider) =>
        (provider?.specializations || [])
          .map((item) => item?.service_type_id)
          .filter((value) => value !== undefined && value !== null)
      )
    ),
  ];

  if (serviceTypeIds.length === 0) {
    return providers;
  }

  const serviceTypes = await ServiceType.query().whereIn("id", serviceTypeIds);
  const serviceTypeMap = new Map(serviceTypes.map((item) => [item.id, item]));

  const enrichProvider = (provider) => ({
    ...provider,
    specializations: (provider.specializations || []).map((item) => ({
      ...item,
      serviceType:
        serviceTypeMap.get(item.service_type_id) || item.serviceType || null,
    })),
  });

  return Array.isArray(providers)
    ? providerList.map(enrichProvider)
    : enrichProvider(providerList[0]);
};

export const listProviders = async (filters) => {
  const {
    province_id,
    regency_id,
    city,
    service_type_id,
    min_years_experience,
    min_price,
    max_price,
    min_rating,
    verified_only,
    available_date,
    start_time,
    duration_hours,
    sort,
    page,
    limit,
  } = filters;

  const { currentPage, perPage } = parsePagination(page, limit);

  const query = Provider.query()
    .alias("p")
    .withGraphFetched("[user, specializations, availabilities]");

  const verifiedOnly = parseBoolean(verified_only);
  if (verifiedOnly === true || verifiedOnly === undefined) {
    query.where("p.is_verified", true);
  }

  if (province_id) {
    query.where("p.province_id", String(province_id));
  }

  if (regency_id) {
    query.where("p.regency_id", String(regency_id));
  }

  if (city) {
    query.whereRaw("LOWER(p.base_location_city) = LOWER(?)", [city]);
  }

  if (service_type_id) {
    query.whereExists(
      ProviderSpecialization.query()
        .alias("ps")
        .select(1)
        .whereRaw("ps.provider_profile_id = p.id")
        .where("ps.service_type_id", Number(service_type_id))
    );
  }

  if (min_years_experience) {
    query.where("p.years_experience", ">=", Number(min_years_experience));
  }

  if (min_price) {
    query.where("p.price_per_hour", ">=", Number(min_price));
  }

  if (max_price) {
    query.where("p.price_per_hour", "<=", Number(max_price));
  }

  if (min_rating) {
    query.where("p.avg_rating", ">=", Number(min_rating));
  }

  if (available_date && start_time && duration_hours) {
    const requestedDate = new Date(available_date);
    const dayOfWeek = requestedDate.getDay();
    const requestedEndTime = buildEndTime(start_time, duration_hours);

    query.whereExists(function checkAvailabilityWindow() {
      this.select(1)
        .from("provider_availabilities as pa")
        .whereRaw("pa.provider_profile_id = p.id")
        .where("pa.day_of_week", dayOfWeek)
        .where("pa.is_active", true)
        .whereRaw("pa.start_time <= ?", [start_time])
        .whereRaw("pa.end_time >= ?", [requestedEndTime]);
    });

    query.whereNotExists(function checkBookingConflict() {
      this.select(1)
        .from("bookings as b")
        .whereRaw("b.provider_profile_id = p.id")
        .where("b.booking_date", available_date)
        .whereIn("b.status", ["pending", "accepted"])
        .whereRaw("b.start_time < ?", [requestedEndTime])
        .whereRaw("b.end_time > ?", [start_time]);
    });
  }

  switch (sort) {
    case "price_asc":
      query.orderBy("p.price_per_hour", "asc");
      break;
    case "price_desc":
      query.orderBy("p.price_per_hour", "desc");
      break;
    case "reviews_desc":
      query.orderBy("p.total_reviews", "desc");
      break;
    case "rating_desc":
    default:
      query.orderBy("p.avg_rating", "desc");
      break;
  }

  const { results, total } = await query.page(currentPage - 1, perPage);
  const hydratedResults = await hydrateServiceTypes(results);
  const items = hydratedResults.map((provider) =>
    sanitizeProviderGraph(provider)
  );

  return {
    items,
    pagination: {
      page: currentPage,
      limit: perPage,
      total,
      total_pages: Math.max(Math.ceil(total / perPage), 1),
    },
  };
};

export const getProviderDetail = async (providerId) => {
  const provider = await Provider.query()
    .findById(providerId)
    .withGraphFetched(
      "[user, specializations, certifications, availabilities]"
    );

  if (!provider) {
    throw makeError(404, "Provider not found");
  }

  return sanitizeProviderGraph(await hydrateServiceTypes(provider));
};

export const getMyProviderProfile = async (userId) => {
  const provider = await Provider.query()
    .findOne({ user_id: userId })
    .withGraphFetched(
      "[user, specializations, certifications, availabilities]"
    );

  if (!provider) {
    throw makeError(404, "Provider profile not found");
  }

  return sanitizeProviderGraph(await hydrateServiceTypes(provider));
};

export const updateMyProviderProfile = async (userId, payload) => {
  const provider = await findProviderByUserId(userId);

  const candidateProvinceId = payload.province_id ?? provider.province_id;
  const candidateProvinceName = payload.province_name ?? provider.province_name;
  const candidateRegencyId = payload.regency_id ?? provider.regency_id;
  const candidateRegencyName = payload.regency_name ?? provider.regency_name;

  if (
    (candidateProvinceId && !candidateProvinceName) ||
    (!candidateProvinceId && candidateProvinceName)
  ) {
    throw makeError(
      422,
      "province_id and province_name must be provided together"
    );
  }

  if (
    (candidateRegencyId && !candidateRegencyName) ||
    (!candidateRegencyId && candidateRegencyName)
  ) {
    throw makeError(
      422,
      "regency_id and regency_name must be provided together"
    );
  }

  const patchData = {
    bio: payload.bio,
    years_experience: payload.years_experience,
    province_id: payload.province_id,
    province_name: payload.province_name,
    regency_id: payload.regency_id,
    regency_name: payload.regency_name,
    base_location_city: payload.base_location_city,
    base_location_lat: payload.base_location_lat,
    base_location_lng: payload.base_location_lng,
    price_per_hour: payload.price_per_hour,
  };

  Object.keys(patchData).forEach((key) => {
    if (patchData[key] === undefined) {
      delete patchData[key];
    }
  });

  if (Object.keys(patchData).length === 0) {
    throw makeError(400, "No valid fields to update");
  }

  return Provider.query().patchAndFetchById(provider.id, patchData);
};

export const updateProviderProfileById = async (providerId, payload) => {
  const provider = await findProviderById(providerId);

  const candidateProvinceId = payload.province_id ?? provider.province_id;
  const candidateProvinceName = payload.province_name ?? provider.province_name;
  const candidateRegencyId = payload.regency_id ?? provider.regency_id;
  const candidateRegencyName = payload.regency_name ?? provider.regency_name;

  if (
    (candidateProvinceId && !candidateProvinceName) ||
    (!candidateProvinceId && candidateProvinceName)
  ) {
    throw makeError(
      422,
      "province_id and province_name must be provided together"
    );
  }

  if (
    (candidateRegencyId && !candidateRegencyName) ||
    (!candidateRegencyId && candidateRegencyName)
  ) {
    throw makeError(
      422,
      "regency_id and regency_name must be provided together"
    );
  }

  const patchData = {
    bio: payload.bio,
    years_experience: payload.years_experience,
    province_id: payload.province_id,
    province_name: payload.province_name,
    regency_id: payload.regency_id,
    regency_name: payload.regency_name,
    base_location_city: payload.base_location_city,
    base_location_lat: payload.base_location_lat,
    base_location_lng: payload.base_location_lng,
    price_per_hour: payload.price_per_hour,
  };

  Object.keys(patchData).forEach((key) => {
    if (patchData[key] === undefined) {
      delete patchData[key];
    }
  });

  if (Object.keys(patchData).length === 0) {
    throw makeError(400, "No valid fields to update");
  }

  return Provider.query().patchAndFetchById(provider.id, patchData);
};

export const upsertMySpecializations = async (userId, serviceTypeIds) => {
  const provider = await findProviderByUserId(userId);

  const existingServiceTypes = await ServiceType.query().whereIn(
    "id",
    serviceTypeIds
  );
  if (existingServiceTypes.length !== serviceTypeIds.length) {
    throw makeError(400, "One or more service_type_ids are invalid");
  }

  await Provider.transaction(async (trx) => {
    for (const serviceTypeId of serviceTypeIds) {
      const exists = await ProviderSpecialization.query(trx).findOne({
        provider_profile_id: provider.id,
        service_type_id: serviceTypeId,
      });

      if (!exists) {
        await ProviderSpecialization.query(trx).insert({
          provider_profile_id: provider.id,
          service_type_id: serviceTypeId,
        });
      }
    }
  });

  return ProviderSpecialization.query()
    .where("provider_profile_id", provider.id)
    .withGraphFetched("serviceType");
};

export const removeMySpecialization = async (userId, serviceTypeId) => {
  const provider = await findProviderByUserId(userId);

  const deleted = await ProviderSpecialization.query().delete().where({
    provider_profile_id: provider.id,
    service_type_id: serviceTypeId,
  });

  if (!deleted) {
    throw makeError(404, "Specialization not found");
  }
};

export const createMyAvailability = async (userId, payload) => {
  const provider = await findProviderByUserId(userId);

  return ProviderAvailability.query().insertAndFetch({
    provider_profile_id: provider.id,
    day_of_week: payload.day_of_week,
    start_time: payload.start_time,
    end_time: payload.end_time,
    is_active: payload.is_active ?? true,
  });
};

export const createProviderAvailabilityById = async (providerId, payload) => {
  const provider = await findProviderById(providerId);

  return ProviderAvailability.query().insertAndFetch({
    provider_profile_id: provider.id,
    day_of_week: payload.day_of_week,
    start_time: payload.start_time,
    end_time: payload.end_time,
    is_active: payload.is_active ?? true,
  });
};

export const updateMyAvailability = async (userId, availabilityId, payload) => {
  const provider = await findProviderByUserId(userId);

  const availability = await ProviderAvailability.query().findById(
    availabilityId
  );
  if (!availability || availability.provider_profile_id !== provider.id) {
    throw makeError(404, "Availability not found");
  }

  const patchData = {
    day_of_week: payload.day_of_week,
    start_time: payload.start_time,
    end_time: payload.end_time,
    is_active: payload.is_active,
  };

  Object.keys(patchData).forEach((key) => {
    if (patchData[key] === undefined) {
      delete patchData[key];
    }
  });

  return ProviderAvailability.query().patchAndFetchById(
    availabilityId,
    patchData
  );
};

export const updateProviderAvailabilityById = async (
  providerId,
  availabilityId,
  payload
) => {
  const provider = await findProviderById(providerId);

  const availability = await ProviderAvailability.query().findById(
    availabilityId
  );
  if (!availability || availability.provider_profile_id !== provider.id) {
    throw makeError(404, "Availability not found");
  }

  const patchData = {
    day_of_week: payload.day_of_week,
    start_time: payload.start_time,
    end_time: payload.end_time,
    is_active: payload.is_active,
  };

  Object.keys(patchData).forEach((key) => {
    if (patchData[key] === undefined) {
      delete patchData[key];
    }
  });

  return ProviderAvailability.query().patchAndFetchById(
    availabilityId,
    patchData
  );
};

export const createProviderCertificationByProviderId = async (
  providerId,
  file
) => {
  if (!file) {
    throw makeError(422, "certificate_file is required");
  }

  const provider = await findProviderById(providerId);
  const uploaded = await uploadFileToStorage({
    buffer: file.buffer,
    contentType: file.mimetype,
    folder: env.storage.folders.certificates,
    originalName: file.originalname,
  });

  return ProviderCertification.query().insertAndFetch({
    provider_profile_id: provider.id,
    file_url: uploaded.url,
  });
};

export const createMyProviderCertification = async (userId, file) => {
  if (!file) {
    throw makeError(422, "certificate_file is required");
  }

  const provider = await findProviderByUserId(userId);
  const uploaded = await uploadFileToStorage({
    buffer: file.buffer,
    contentType: file.mimetype,
    folder: env.storage.folders.certificates,
    originalName: file.originalname,
  });

  return ProviderCertification.query().insertAndFetch({
    provider_profile_id: provider.id,
    file_url: uploaded.url,
  });
};

export const getMyProviderCertifications = async (userId) => {
  const provider = await findProviderByUserId(userId);

  return ProviderCertification.query()
    .where("provider_profile_id", provider.id)
    .orderBy("created_at", "desc");
};

export const updateMyProviderCertification = async (
  userId,
  certificationId,
  file
) => {
  if (!file) {
    throw makeError(422, "certificate_file is required");
  }

  const provider = await findProviderByUserId(userId);
  const certification = await ProviderCertification.query().findById(
    certificationId
  );

  if (!certification || certification.provider_profile_id !== provider.id) {
    throw makeError(404, "Certification not found");
  }

  const uploaded = await uploadFileToStorage({
    buffer: file.buffer,
    contentType: file.mimetype,
    folder: env.storage.folders.certificates,
    originalName: file.originalname,
  });

  return ProviderCertification.query().patchAndFetchById(certificationId, {
    file_url: uploaded.url,
    is_verified: false,
    verified_by: null,
    verified_at: null,
  });
};

export const deleteMyProviderCertification = async (
  userId,
  certificationId
) => {
  const provider = await findProviderByUserId(userId);

  const deleted = await ProviderCertification.query().delete().where({
    id: certificationId,
    provider_profile_id: provider.id,
  });

  if (!deleted) {
    throw makeError(404, "Certification not found");
  }
};

export const deleteMyAvailability = async (userId, availabilityId) => {
  const provider = await findProviderByUserId(userId);

  const deleted = await ProviderAvailability.query().delete().where({
    id: availabilityId,
    provider_profile_id: provider.id,
  });

  if (!deleted) {
    throw makeError(404, "Availability not found");
  }
};

export const verifyProviderProfile = async (
  providerId,
  adminUserId,
  payload
) => {
  const provider = await Provider.query().findById(providerId);
  if (!provider) {
    throw makeError(404, "Provider not found");
  }

  const verificationStatus = payload.verification_status;
  const isVerified = verificationStatus === "approved";

  const updatedProvider = await Provider.query().patchAndFetchById(providerId, {
    verification_status: verificationStatus,
    is_verified: isVerified,
    verified_by: adminUserId,
    verified_at: new Date().toISOString(),
  });

  if (!provider.is_verified && isVerified && provider.user_id) {
    try {
      await sendNotificationToUser(
        provider.user_id,
        buildProviderVerificationNotification({ providerId })
      );
    } catch (err) {
      // Log error tapi jangan interrupt verification flow
      console.error(
        "[Provider Service] Failed to send provider verification notification:",
        err.message
      );
    }
  }

  return updatedProvider;
};

export const listServiceTypes = async () => {
  return ServiceType.query()
    .select("id", "name", "code", "description")
    .orderBy("id", "asc");
};

/**
 * Verifikasi sertifikasi provider oleh admin
 * @param {string} certificationId - ID sertifikasi
 * @param {string} adminUserId - ID admin yang verify
 * @param {boolean} isApproved - True untuk approve, false untuk reject
 * @returns {object} Updated certification
 */
export const verifyCertification = async (
  certificationId,
  adminUserId,
  isApproved
) => {
  const cert = await ProviderCertification.query()
    .findById(certificationId)
    .withGraphFetched("providerProfile");

  if (!cert) {
    throw makeError(404, "Certification not found");
  }

  const updatedCert = await ProviderCertification.query().patchAndFetchById(
    certificationId,
    {
      is_verified: isApproved,
      verified_by: adminUserId,
      verified_at: new Date().toISOString(),
    }
  );

  // Send push notification to provider about certification verification result
  try {
    const providerUserId = cert.providerProfile?.user_id;
    if (providerUserId) {
      await sendNotificationToUser(
        providerUserId,
        buildCertificationVerificationNotification({
          certificationId,
          certificationName: cert.certification_name,
          isApproved,
        })
      );
    }
  } catch (err) {
    // Log error tapi jangan interrupt verification
    console.error(
      "[Provider Service] Failed to send certification notification:",
      err.message
    );
  }

  return updatedCert;
};
