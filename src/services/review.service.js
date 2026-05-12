/*
Tujuan: Mengelola review booking dan query review untuk user/provider dashboard.
Caller: review.controller serta booking flow saat review dibuat.
Dependensi: Booking, Provider, Review, raw aggregate Objection, push.service, notification.templates.
Main Functions: createReview, getProviderReviews, getMyReviews.
Side Effects: Insert review, hitung ulang rating provider, kirim FCM review_created ke provider pasca-commit, dan filter akses berbasis role.
*/

import { raw } from "objection";
import { Booking } from "../models/Booking.js";
import { Provider } from "../models/Provider.js";
import { Review } from "../models/Review.js";
import { buildReviewCreatedNotification } from "./notification.templates.js";
import { sendNotificationToUser } from "./push.service.js";

const makeError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

const getUserId = (user) => user?.sub || user?.id;

const recalculateProviderRating = async (trx, providerProfileId) => {
  const aggregate = await Review.query(trx)
    .where("provider_profile_id", providerProfileId)
    .select(raw("COALESCE(AVG(rating), 0) as avg_rating"))
    .count("id as total_reviews")
    .first();

  await Provider.query(trx).patchAndFetchById(providerProfileId, {
    avg_rating: Number(Number(aggregate.avg_rating || 0).toFixed(2)),
    total_reviews: Number(aggregate.total_reviews || 0),
  });
};

const paginateQuery = async (queryBuilder, page, limit) => {
  const offset = (page - 1) * limit;
  const countRow = await queryBuilder
    .clone()
    .clearSelect()
    .clearOrder()
    .count({ count: "*" })
    .first();

  const total = Number(countRow?.count ?? 0);
  const results = await queryBuilder.clone().limit(limit).offset(offset);

  return {
    results,
    total: Number.isFinite(total) ? total : 0,
  };
};

export const createReview = async (user, payload) => {
  const userId = getUserId(user);

  if (user.role !== "user") {
    throw makeError(403, "Only user can create review");
  }

  return Review.transaction(async (trx) => {
    const booking = await Booking.query(trx)
      .findById(payload.booking_id)
      .withGraphFetched("providerProfile");
    if (!booking) {
      throw makeError(404, "Booking not found");
    }

    if (booking.user_id !== userId) {
      throw makeError(403, "Forbidden");
    }

    // Disallow reviews for cancelled bookings and only allow for completed
    if (String(booking.status).toLowerCase() === "cancelled") {
      throw makeError(400, "Cannot create review for a cancelled booking");
    }

    if (booking.status !== "completed") {
      throw makeError(400, "Review can only be created for completed booking");
    }

    const existing = await Review.query(trx).findOne({
      booking_id: booking.id,
    });
    if (existing) {
      throw makeError(409, "Review already exists for this booking");
    }

    const review = await Review.query(trx).insertAndFetch({
      booking_id: booking.id,
      reviewer_user_id: userId,
      provider_profile_id: booking.provider_profile_id,
      rating: payload.rating,
      comment: payload.comment ?? null,
    });

    await recalculateProviderRating(trx, booking.provider_profile_id);

    return { review, booking };
  }).then(async ({ review, booking }) => {
    try {
      const providerUserId = booking.providerProfile?.user_id;
      if (providerUserId) {
        await sendNotificationToUser(
          providerUserId,
          buildReviewCreatedNotification({ review, booking })
        );
      }
    } catch (err) {
      console.error(
        "[Review Service] Failed to send review notification:",
        err.message
      );
    }

    return review;
  });
};

export const getProviderReviews = async (providerId, query) => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 50);

  const offset = (page - 1) * limit;

  const countRow = await Review.query()
    .where("provider_profile_id", providerId)
    .clearSelect()
    .clearOrder()
    .count({ count: "*" })
    .first();
  const total = Number(countRow?.count ?? 0);

  const results = await Review.query()
    .where("provider_profile_id", providerId)
    .select(
      "id",
      "booking_id",
      "reviewer_user_id",
      "provider_profile_id",
      "rating",
      "comment",
      "created_at"
    )
    .orderBy("created_at", "desc")
    .limit(limit)
    .offset(offset);

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

export const getMyReviews = async (user, query) => {
  if (user.role !== "user") {
    throw makeError(403, "Only user can access their own reviews");
  }

  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 50);

  const offset = (page - 1) * limit;

  const countRow = await Review.query()
    .where("reviewer_user_id", getUserId(user))
    .clearSelect()
    .clearOrder()
    .count({ count: "*" })
    .first();
  const total = Number(countRow?.count ?? 0);

  const results = await Review.query()
    .where("reviewer_user_id", getUserId(user))
    .select(
      "id",
      "booking_id",
      "reviewer_user_id",
      "provider_profile_id",
      "rating",
      "comment",
      "created_at"
    )
    .orderBy("created_at", "desc")
    .limit(limit)
    .offset(offset);

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
