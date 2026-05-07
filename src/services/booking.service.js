/*
Tujuan: Menangani booking lifecycle dan query dashboard booking user/provider.
Caller: booking.controller untuk create, list me, detail, status update, dan history.
Dependensi: Booking, BookingStatusHistory, Provider, ProviderAvailability, ProviderSpecialization, pricing utils, push.service.
Main Functions: createBooking, getMyBookings, getBookingDetail, updateBookingStatus, getBookingHistory.
Side Effects: Insert booking/status history, validasi slot provider, send push notification ke provider, dan pembatasan akses berbasis role.
*/

import { Booking } from "../models/Booking.js";
import { BookingStatusHistory } from "../models/BookingStatusHistory.js";
import { Provider } from "../models/Provider.js";
import { ProviderAvailability } from "../models/ProviderAvailability.js";
import { ProviderSpecialization } from "../models/ProviderSpecialization.js";
import { ServiceType } from "../models/ServiceType.js";
import { createBookingCode } from "../utils/bookingCode.js";
import {
  calculateDurationHours,
  calculateTotalPrice,
} from "../utils/pricing.js";
import { sendNotificationToUser } from "./push.service.js";

const parseTimeToMinutes = (value) => {
  const [hours, minutes, seconds] = value.split(":").map(Number);
  return hours * 60 + minutes + (seconds || 0) / 60;
};

const buildInterval = (startTime, endTime) => {
  const startMinutes = parseTimeToMinutes(startTime);
  let endMinutes = parseTimeToMinutes(endTime);

  if (endMinutes <= startMinutes) {
    endMinutes += 24 * 60;
  }

  return { startMinutes, endMinutes };
};

const intervalsOverlap = (left, right) => {
  return (
    left.startMinutes < right.endMinutes && left.endMinutes > right.startMinutes
  );
};

const intervalWithin = (inner, outer) => {
  return (
    inner.startMinutes >= outer.startMinutes &&
    inner.endMinutes <= outer.endMinutes
  );
};

const makeError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

const getUserId = (user) => user?.sub || user?.id;

const ensureUserCanReadBooking = (booking, user) => {
  if (user.role === "admin") return;

  const userId = getUserId(user);
  if (user.role === "user" && booking.user_id !== userId) {
    throw makeError(403, "Forbidden");
  }

  if (user.role === "provider" && booking.providerProfile?.user_id !== userId) {
    throw makeError(403, "Forbidden");
  }
};

const ensureProviderOwnsBooking = (booking, providerUserId) => {
  if (
    !booking.providerProfile ||
    booking.providerProfile.user_id !== providerUserId
  ) {
    throw makeError(403, "Forbidden");
  }
};

const getProviderAndCheckService = async (providerProfileId, serviceTypeId) => {
  const provider = await Provider.query().findById(providerProfileId);
  if (!provider) {
    throw makeError(404, "Provider not found");
  }

  if (!provider.is_verified) {
    throw makeError(400, "Provider is not verified");
  }

  const hasService = await ProviderSpecialization.query().findOne({
    provider_profile_id: provider.id,
    service_type_id: serviceTypeId,
  });

  const specializationCount = await ProviderSpecialization.query()
    .where("provider_profile_id", provider.id)
    .resultSize();

  if (specializationCount === 0) {
    return provider;
  }

  if (!hasService) {
    throw makeError(400, "Provider does not offer requested service type");
  }

  return provider;
};

const ensureProviderAvailable = async ({
  providerProfileId,
  bookingDate,
  startTime,
  endTime,
}) => {
  const dayOfWeek = new Date(bookingDate).getDay();
  const requestedInterval = buildInterval(startTime, endTime);

  const availabilities = await ProviderAvailability.query()
    .where("provider_profile_id", providerProfileId)
    .where("day_of_week", dayOfWeek)
    .where("is_active", true);

  if (availabilities.length === 0) {
    return;
  }

  const hasCoverage = availabilities.some((item) => {
    const availabilityInterval = buildInterval(item.start_time, item.end_time);
    return intervalWithin(requestedInterval, availabilityInterval);
  });

  if (!hasCoverage) {
    throw makeError(
      400,
      "Provider is not available in the requested time window"
    );
  }

  const existingBookings = await Booking.query()
    .where("provider_profile_id", providerProfileId)
    .where("booking_date", bookingDate)
    .whereIn("status", ["pending", "accepted"]);

  const conflict = existingBookings.find((item) => {
    const existingInterval = buildInterval(item.start_time, item.end_time);
    return intervalsOverlap(requestedInterval, existingInterval);
  });

  if (conflict) {
    // Provide a more informative conflict message including existing booking code and time
    const code = conflict.booking_code || "(unknown)";
    throw makeError(
      409,
      `Provider has another booking (${code}) on ${bookingDate} ${conflict.start_time}-${conflict.end_time}`
    );
  }
};

const addHistory = async (trx, payload) => {
  await BookingStatusHistory.query(trx).insert({
    booking_id: payload.booking_id,
    from_status: payload.from_status ?? null,
    to_status: payload.to_status,
    changed_by: payload.changed_by,
    changed_at: new Date().toISOString(),
    notes: payload.notes ?? null,
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

export const createBooking = async (user, payload) => {
  if (user.role !== "user") {
    throw makeError(403, "Only user can create booking");
  }

  const userId = getUserId(user);
  const provider = await getProviderAndCheckService(
    payload.provider_profile_id,
    payload.service_type_id
  );

  const durationHours = calculateDurationHours(
    payload.start_time,
    payload.end_time
  );
  if (durationHours <= 0) {
    throw makeError(422, "Invalid time range");
  }

  await ensureProviderAvailable({
    providerProfileId: provider.id,
    bookingDate: payload.booking_date,
    startTime: payload.start_time,
    endTime: payload.end_time,
  });

  const pricePerHour = Number(provider.price_per_hour);
  if (!Number.isFinite(pricePerHour) || pricePerHour <= 0) {
    throw makeError(400, "Provider price per hour is invalid");
  }

  const estimatedPrice = calculateTotalPrice(durationHours, pricePerHour);

  return Booking.transaction(async (trx) => {
    const booking = await Booking.query(trx).insertAndFetch({
      booking_code: createBookingCode(),
      user_id: userId,
      provider_profile_id: provider.id,
      service_type_id: payload.service_type_id,
      booking_date: payload.booking_date,
      start_time: payload.start_time,
      end_time: payload.end_time,
      duration_hours: durationHours,
      location_lat: payload.location_lat,
      location_lng: payload.location_lng,
      price_per_hour_snapshot: pricePerHour,
      price_estimate: estimatedPrice,
      // Keep total_price for backward compatibility; semantically it is an estimate.
      total_price: estimatedPrice,
      status: "pending",
      request_notes: payload.request_notes ?? null,
    });

    await addHistory(trx, {
      booking_id: booking.id,
      from_status: null,
      to_status: "pending",
      changed_by: userId,
      notes: "Booking created",
    });

    return booking;
  }).then(async (booking) => {
    // Send push notification to provider about new booking
    try {
      const providerUserId = provider.user_id;
      if (providerUserId) {
        await sendNotificationToUser(providerUserId, {
          title: "📅 Booking Baru!",
          body: `Ada booking baru pada ${booking.booking_date} jam ${booking.start_time}-${booking.end_time}`,
          icon: "/favicon.ico",
          badge: "/favicon.ico",
          tag: "booking-new",
          data: {
            type: "booking_created",
            booking_id: booking.id,
            url: `/dashboard/provider/permintaan-booking`,
          },
        });
      }
    } catch (err) {
      // Log error tapi jangan interrupt booking flow
      console.error("[Booking Service] Failed to send notification:", err.message);
    }

    return booking;
  });
};

export const getMyBookings = async (user, query) => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 50);

  const userId = getUserId(user);
  const schema = process.env.DB_SCHEMA || "app_mvp";

  const baseQuery = Booking.query()
    .alias("b")
    .select(
      "b.id",
      "b.booking_code",
      "b.user_id",
      "b.provider_profile_id",
      "b.service_type_id",
      "b.booking_date",
      "b.start_time",
      "b.end_time",
      "b.duration_hours",
      "b.location_lat",
      "b.location_lng",
      "b.price_per_hour_snapshot",
      "b.price_estimate",
      "b.total_price",
      "b.status",
      "b.request_notes",
      "b.created_at",
      "pp.base_location_city as provider_base_location_city",
      "pp.years_experience as provider_years_experience",
      "pp.avg_rating as provider_avg_rating",
      "pu.full_name as provider_full_name",
      "pu.image_url as provider_image_url",
      "uu.full_name as user_full_name",
      "uu.image_url as user_image_url",
      "st.name as service_type_name"
    )
    .leftJoin(
      `${schema}.provider_profiles as pp`,
      "pp.id",
      "b.provider_profile_id"
    )
    .leftJoin(`${schema}.users as pu`, "pu.id", "pp.user_id")
    .leftJoin(`${schema}.users as uu`, "uu.id", "b.user_id")
    .leftJoin(`${schema}.service_types as st`, "st.id", "b.service_type_id")
    .orderBy("created_at", "desc");

  if (user.role === "user") {
    baseQuery.where("b.user_id", userId);
  } else if (user.role === "provider") {
    baseQuery.whereExists(
      Provider.query()
        .alias("p")
        .select(1)
        .whereRaw("p.id = b.provider_profile_id")
        .where("p.user_id", userId)
    );
  } else {
    throw makeError(403, "Forbidden");
  }

  // Handle multiple status filter (comma-separated atau array)
  if (query.status) {
    const statuses = Array.isArray(query.status)
      ? query.status
      : String(query.status)
          .split(",")
          .map((s) => s.trim());

    if (statuses.length > 0) {
      baseQuery.whereIn("b.status", statuses);
    }
  }

  // Handle date-range filter based on created_at
  if (query.dateRange) {
    const now = new Date();
    let startDate;

    if (query.dateRange === "today") {
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      baseQuery.where("b.created_at", ">=", startDate.toISOString());
    } else if (query.dateRange === "week") {
      startDate = new Date(now);
      const day = startDate.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      startDate.setDate(startDate.getDate() + diff);
      startDate.setHours(0, 0, 0, 0);
      baseQuery.where("b.created_at", ">=", startDate.toISOString());
    } else if (query.dateRange === "month") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      baseQuery.where("b.created_at", ">=", startDate.toISOString());
    }
  }

  // Or allow custom date filter via booking_date_range (for filtering by booking date instead of creation)
  if (query.bookingDateRange) {
    const now = new Date();
    let startDate;

    if (query.bookingDateRange === "today") {
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      baseQuery.where(
        "b.booking_date",
        ">=",
        startDate.toISOString().split("T")[0]
      );
    } else if (query.bookingDateRange === "week") {
      startDate = new Date(now);
      const day = startDate.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      startDate.setDate(startDate.getDate() + diff);
      startDate.setHours(0, 0, 0, 0);
      baseQuery.where(
        "b.booking_date",
        ">=",
        startDate.toISOString().split("T")[0]
      );
    } else if (query.bookingDateRange === "month") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      baseQuery.where(
        "b.booking_date",
        ">=",
        startDate.toISOString().split("T")[0]
      );
    }
  }

  const offset = (page - 1) * limit;

  const countQuery = Booking.query().alias("b");
  if (user.role === "user") {
    countQuery.where("b.user_id", userId);
  } else if (user.role === "provider") {
    countQuery.whereExists(
      Provider.query()
        .alias("p")
        .select(1)
        .whereRaw("p.id = b.provider_profile_id")
        .where("p.user_id", userId)
    );
  }

  if (query.status) {
    const statuses = Array.isArray(query.status)
      ? query.status
      : String(query.status)
          .split(",")
          .map((s) => s.trim());
    if (statuses.length > 0) {
      countQuery.whereIn("b.status", statuses);
    }
  }

  // Apply same date filters to count query
  if (query.dateRange) {
    const now = new Date();
    let startDate;

    if (query.dateRange === "today") {
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      countQuery.where("b.created_at", ">=", startDate.toISOString());
    } else if (query.dateRange === "week") {
      startDate = new Date(now);
      const day = startDate.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      startDate.setDate(startDate.getDate() + diff);
      startDate.setHours(0, 0, 0, 0);
      countQuery.where("b.created_at", ">=", startDate.toISOString());
    } else if (query.dateRange === "month") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      countQuery.where("b.created_at", ">=", startDate.toISOString());
    }
  }

  if (query.bookingDateRange) {
    const now = new Date();
    let startDate;

    if (query.bookingDateRange === "today") {
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      countQuery.where(
        "b.booking_date",
        ">=",
        startDate.toISOString().split("T")[0]
      );
    } else if (query.bookingDateRange === "week") {
      startDate = new Date(now);
      const day = startDate.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      startDate.setDate(startDate.getDate() + diff);
      startDate.setHours(0, 0, 0, 0);
      countQuery.where(
        "b.booking_date",
        ">=",
        startDate.toISOString().split("T")[0]
      );
    } else if (query.bookingDateRange === "month") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      countQuery.where(
        "b.booking_date",
        ">=",
        startDate.toISOString().split("T")[0]
      );
    }
  }

  const countRow = await countQuery
    .clearSelect()
    .clearOrder()
    .count({ count: "*" })
    .first();
  const total = Number(countRow?.count ?? 0);

  const results = await baseQuery.limit(limit).offset(offset);
  const items = results.map((row) => ({
    id: row.id,
    booking_code: row.booking_code,
    user_id: row.user_id,
    provider_profile_id: row.provider_profile_id,
    service_type_id: row.service_type_id,
    booking_date: row.booking_date,
    start_time: row.start_time,
    end_time: row.end_time,
    duration_hours: row.duration_hours,
    location_lat: row.location_lat,
    location_lng: row.location_lng,
    price_per_hour_snapshot: row.price_per_hour_snapshot,
    price_estimate: row.price_estimate,
    total_price: row.total_price,
    status: row.status,
    request_notes: row.request_notes,
    created_at: row.created_at,
    provider: {
      id: row.provider_profile_id,
      full_name: row.provider_full_name,
      profile_image_url: row.provider_image_url,
      base_location_city: row.provider_base_location_city,
      years_experience: row.provider_years_experience,
      rating: row.provider_avg_rating,
    },
    user: {
      id: row.user_id,
      full_name: row.user_full_name,
      image_url: row.user_image_url,
    },
    service_type: {
      id: row.service_type_id,
      name: row.service_type_name,
    },
  }));

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.max(Math.ceil(total / limit), 1),
    },
  };
};

export const getBookingDetail = async (bookingId, user) => {
  const booking = await Booking.query()
    .findById(bookingId)
    .withGraphFetched(
      "[user, providerProfile.[user], statusHistories, review]"
    );

  if (!booking) {
    throw makeError(404, "Booking not found");
  }

  booking.serviceType = booking.service_type_id
    ? await ServiceType.query().findById(booking.service_type_id)
    : null;

  // Ensure statusHistories is ordered
  if (booking.statusHistories && Array.isArray(booking.statusHistories)) {
    booking.statusHistories.sort((a, b) => {
      const aTime = new Date(a.changed_at).getTime();
      const bTime = new Date(b.changed_at).getTime();
      return aTime - bTime;
    });
  }

  ensureUserCanReadBooking(booking, user);
  return booking;
};

export const updateBookingStatus = async ({
  bookingId,
  user,
  targetStatus,
  cancelReason,
}) => {
  const userId = getUserId(user);

  return Booking.transaction(async (trx) => {
    const booking = await Booking.query(trx)
      .findById(bookingId)
      .withGraphFetched("providerProfile");

    if (!booking) {
      throw makeError(404, "Booking not found");
    }

    const current = booking.status;

    if (targetStatus === "accepted") {
      if (user.role !== "provider") {
        throw makeError(403, "Only provider can accept booking");
      }
      ensureProviderOwnsBooking(booking, userId);
      if (current !== "pending") {
        throw makeError(400, "Only pending booking can be accepted");
      }

      const updated = await Booking.query(trx).patchAndFetchById(bookingId, {
        status: "accepted",
        accepted_at: new Date().toISOString(),
      });

      await addHistory(trx, {
        booking_id: bookingId,
        from_status: current,
        to_status: "accepted",
        changed_by: userId,
        notes: "Booking accepted by provider",
      });

      return updated;
    }

    if (targetStatus === "completed") {
      if (user.role !== "provider") {
        throw makeError(403, "Only provider can complete booking");
      }
      ensureProviderOwnsBooking(booking, userId);
      if (current !== "accepted") {
        throw makeError(400, "Only accepted booking can be completed");
      }

      const updated = await Booking.query(trx).patchAndFetchById(bookingId, {
        status: "completed",
        completed_at: new Date().toISOString(),
      });

      await addHistory(trx, {
        booking_id: bookingId,
        from_status: current,
        to_status: "completed",
        changed_by: userId,
        notes: "Booking completed by provider",
      });

      return updated;
    }

    if (targetStatus === "cancelled") {
      const isAdmin = user.role === "admin";
      const isUserOwner = user.role === "user" && booking.user_id === userId;
      const isProviderOwner =
        user.role === "provider" && booking.providerProfile?.user_id === userId;

      if (!isAdmin && !isUserOwner && !isProviderOwner) {
        throw makeError(403, "Forbidden");
      }

      if (!["pending", "accepted"].includes(current)) {
        throw makeError(
          400,
          "Only pending or accepted booking can be cancelled"
        );
      }

      const updated = await Booking.query(trx).patchAndFetchById(bookingId, {
        status: "cancelled",
        cancel_reason: cancelReason ?? null,
        cancelled_at: new Date().toISOString(),
      });

      await addHistory(trx, {
        booking_id: bookingId,
        from_status: current,
        to_status: "cancelled",
        changed_by: userId,
        notes: cancelReason || "Booking cancelled",
      });

      return updated;
    }

    throw makeError(400, "Unsupported status transition");
  }).then(async (updatedBooking) => {
    // Send push notifications for status changes
    try {
      if (targetStatus === "accepted") {
        // Notify user that provider accepted booking
        await sendNotificationToUser(updatedBooking.user_id, {
          title: "✅ Booking Diterima!",
          body: `Provider telah menerima booking Anda untuk ${updatedBooking.booking_date}`,
          icon: "/favicon.ico",
          badge: "/favicon.ico",
          tag: "booking-accepted",
          data: {
            type: "booking_accepted",
            booking_id: updatedBooking.id,
            url: `/dashboard/user/booking/${updatedBooking.id}`,
          },
        });
      } else if (targetStatus === "cancelled") {
        // Notify relevant party about cancellation
        const cancelledByProvider =
          user.role === "provider" ||
          booking.providerProfile?.user_id === userId;
        const recipientUserId = cancelledByProvider
          ? updatedBooking.user_id
          : booking.providerProfile?.user_id;

        if (recipientUserId) {
          const notifMessage = cancelledByProvider
            ? "Provider membatalkan booking Anda"
            : "Booking Anda telah dibatalkan";

          await sendNotificationToUser(recipientUserId, {
            title: "❌ Booking Dibatalkan",
            body: notifMessage + (cancelReason ? `: ${cancelReason}` : ""),
            icon: "/favicon.ico",
            badge: "/favicon.ico",
            tag: "booking-cancelled",
            data: {
              type: "booking_cancelled",
              booking_id: updatedBooking.id,
              reason: cancelReason,
              url: `/dashboard/${cancelledByProvider ? "user" : "provider"}/bookings`,
            },
          });
        }
      } else if (targetStatus === "completed") {
        // Notify user that booking is completed
        await sendNotificationToUser(updatedBooking.user_id, {
          title: "🎉 Booking Selesai",
          body: `Booking untuk ${updatedBooking.booking_date} telah diselesaikan`,
          icon: "/favicon.ico",
          badge: "/favicon.ico",
          tag: "booking-completed",
          data: {
            type: "booking_completed",
            booking_id: updatedBooking.id,
            url: `/dashboard/user/booking/${updatedBooking.id}`,
          },
        });
      }
    } catch (err) {
      // Log error tapi jangan interrupt status update
      console.error(
        "[Booking Service] Failed to send status change notification:",
        err.message
      );
    }

    return updatedBooking;
  });
};

export const getBookingHistory = async (bookingId, user) => {
  const booking = await Booking.query()
    .findById(bookingId)
    .withGraphFetched("providerProfile");

  if (!booking) {
    throw makeError(404, "Booking not found");
  }

  ensureUserCanReadBooking(booking, user);

  const histories = await BookingStatusHistory.query()
    .where("booking_id", bookingId)
    .withGraphFetched("changedByUser")
    .orderBy("changed_at", "asc");

  return histories;
};
