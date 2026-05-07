import {
  createBooking,
  getBookingDetail,
  getBookingHistory,
  getMyBookings,
  updateBookingStatus,
} from "../services/booking.service.js";

export const createBookingHandler = async (req, res, next) => {
  try {
    const booking = await createBooking(req.user, req.body);
    return res.status(201).json({
      success: true,
      message: "Booking created",
      data: { booking },
    });
  } catch (err) {
    return next(err);
  }
};

export const getMyBookingsHandler = async (req, res, next) => {
  try {
    const data = await getMyBookings(req.user, req.query);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return next(err);
  }
};

export const getBookingByIdHandler = async (req, res, next) => {
  try {
    const booking = await getBookingDetail(req.params.id, req.user);
    return res.status(200).json({ success: true, data: { booking } });
  } catch (err) {
    return next(err);
  }
};

export const acceptBookingHandler = async (req, res, next) => {
  try {
    const booking = await updateBookingStatus({
      bookingId: req.params.id,
      user: req.user,
      targetStatus: "accepted",
    });

    return res.status(200).json({
      success: true,
      message: "Booking accepted",
      data: { booking },
    });
  } catch (err) {
    return next(err);
  }
};

export const completeBookingHandler = async (req, res, next) => {
  try {
    const booking = await updateBookingStatus({
      bookingId: req.params.id,
      user: req.user,
      targetStatus: "completed",
    });

    return res.status(200).json({
      success: true,
      message: "Booking completed",
      data: { booking },
    });
  } catch (err) {
    return next(err);
  }
};

export const cancelBookingHandler = async (req, res, next) => {
  try {
    const booking = await updateBookingStatus({
      bookingId: req.params.id,
      user: req.user,
      targetStatus: "cancelled",
      cancelReason: req.body.cancel_reason,
    });

    return res.status(200).json({
      success: true,
      message: "Booking cancelled",
      data: { booking },
    });
  } catch (err) {
    return next(err);
  }
};

export const getBookingHistoryHandler = async (req, res, next) => {
  try {
    const histories = await getBookingHistory(req.params.id, req.user);
    return res.status(200).json({
      success: true,
      data: { histories },
    });
  } catch (err) {
    return next(err);
  }
};
