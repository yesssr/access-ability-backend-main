/*
Tujuan: Menghitung rekomendasi provider berbasis scoring multi-faktor dan menyimpan histori matching.
Caller: matching.controller.
Dependensi: model AiMatchingLog, Booking, Provider, ProviderAvailability, ProviderSpecialization.
Main Functions: getRecommendations, getMyMatchingHistory.
Side Effects: DB read untuk scoring, DB write ai_matching_logs untuk audit rekomendasi.
*/

import { AiMatchingLog } from "../models/AiMatchingLog.js";
import { Booking } from "../models/Booking.js";
import { Provider } from "../models/Provider.js";
import { ProviderAvailability } from "../models/ProviderAvailability.js";
import { ProviderSpecialization } from "../models/ProviderSpecialization.js";

const getUserId = (user) => user?.sub || user?.id;

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

const round4 = (value) => Number(Number(value).toFixed(4));

const getAvailabilityScore = async (providerId, payload) => {
  if (
    !payload.requested_date ||
    !payload.requested_start_time ||
    !payload.requested_duration_hours
  ) {
    return 0.5;
  }

  const dayOfWeek = new Date(payload.requested_date).getDay();
  const requestedEndTime = buildEndTime(
    payload.requested_start_time,
    payload.requested_duration_hours
  );

  const hasWindow = await ProviderAvailability.query()
    .where("provider_profile_id", providerId)
    .where("day_of_week", dayOfWeek)
    .where("is_active", true)
    .where("start_time", "<=", payload.requested_start_time)
    .where("end_time", ">=", requestedEndTime)
    .first();

  if (!hasWindow) return 0;

  const conflict = await Booking.query()
    .where("provider_profile_id", providerId)
    .where("booking_date", payload.requested_date)
    .whereIn("status", ["pending", "accepted"])
    .where("start_time", "<", requestedEndTime)
    .where("end_time", ">", payload.requested_start_time)
    .first();

  return conflict ? 0 : 1;
};

const getLocationScore = (provider, payload) => {
  if (payload.requested_regency_id) {
    return provider.regency_id === String(payload.requested_regency_id) ? 1 : 0;
  }

  if (!payload.requested_city) return 0.5;
  return provider.base_location_city?.toLowerCase() ===
    payload.requested_city.toLowerCase()
    ? 1
    : 0;
};

const getQualityScore = (provider) => {
  const ratingPart = Number(provider.avg_rating || 0) / 5;
  const confidence = Math.min(Number(provider.total_reviews || 0) / 50, 1);
  return round4(0.7 * ratingPart + 0.3 * confidence);
};

const getPriceScore = (providerPrice, budgetMax, minPrice, maxPrice) => {
  const price = Number(providerPrice);

  if (budgetMax) {
    const ratio = price / Number(budgetMax);
    return round4(Math.max(0, 1 - ratio));
  }

  if (maxPrice === minPrice) return 1;

  const normalized = (maxPrice - price) / (maxPrice - minPrice);
  return round4(Math.max(0, Math.min(1, normalized)));
};

export const getRecommendations = async (user, payload) => {
  const userId = getUserId(user);
  const topN = Math.min(Math.max(Number(payload.top_n) || 5, 1), 20);

  const providerIdsByService = await ProviderSpecialization.query()
    .where("service_type_id", payload.requested_service_type_id)
    .select("provider_profile_id");

  const providerIds = providerIdsByService.map((v) => v.provider_profile_id);
  if (providerIds.length === 0) {
    return { recommendations: [] };
  }

  const providers = await Provider.query()
    .whereIn("id", providerIds)
    .where("is_verified", true);

  if (providers.length === 0) {
    return { recommendations: [] };
  }

  const prices = providers.map((p) => Number(p.price_per_hour));
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  const scored = [];

  for (const provider of providers) {
    const skillScore = 1;
    const availabilityScore = await getAvailabilityScore(provider.id, payload);
    if (availabilityScore === 0 && payload.requested_date) {
      continue;
    }

    const locationScore = getLocationScore(provider, payload);
    const priceScore = getPriceScore(
      provider.price_per_hour,
      payload.budget_max,
      minPrice,
      maxPrice
    );
    const qualityScore = getQualityScore(provider);

    const scoreTotal = round4(
      0.35 * skillScore +
        0.25 * availabilityScore +
        0.15 * locationScore +
        0.15 * priceScore +
        0.1 * qualityScore
    );

    scored.push({
      provider,
      score_total: scoreTotal,
      score_breakdown: {
        weights: {
          skill: 0.35,
          availability: 0.25,
          location: 0.15,
          price: 0.15,
          quality: 0.1,
        },
        scores: {
          skill: skillScore,
          availability: availabilityScore,
          location: locationScore,
          price: priceScore,
          quality: qualityScore,
        },
      },
    });
  }

  scored.sort((a, b) => b.score_total - a.score_total);
  const recommendations = scored.slice(0, topN);

  await AiMatchingLog.transaction(async (trx) => {
    for (const item of recommendations) {
      await AiMatchingLog.query(trx).insert({
        user_id: userId,
        requested_service_type_id: payload.requested_service_type_id,
        requested_regency_id: payload.requested_regency_id ?? null,
        requested_city: payload.requested_city ?? null,
        requested_date: payload.requested_date ?? null,
        requested_start_time: payload.requested_start_time ?? null,
        requested_duration_hours: payload.requested_duration_hours ?? null,
        provider_profile_id: item.provider.id,
        score_total: item.score_total,
        score_breakdown: item.score_breakdown,
      });
    }
  });

  return {
    recommendations: recommendations.map((item) => ({
      provider: item.provider,
      score_total: item.score_total,
      score_breakdown: item.score_breakdown,
    })),
  };
};

export const getMyMatchingHistory = async (user, query) => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 50);

  const { results, total } = await AiMatchingLog.query()
    .where("user_id", getUserId(user))
    .withGraphFetched("[providerProfile.[user], requestedServiceType]")
    .orderBy("created_at", "desc")
    .page(page - 1, limit);

  return {
    items: results,
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.max(Math.ceil(total / limit), 1),
    },
  };
};
