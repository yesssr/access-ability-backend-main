import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/role.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  acceptBookingHandler,
  cancelBookingHandler,
  completeBookingHandler,
  createBookingHandler,
  getBookingByIdHandler,
  getBookingHistoryHandler,
  getMyBookingsHandler,
} from "../controllers/booking.controller.js";
import {
  bookingIdParamValidator,
  cancelBookingValidator,
  createBookingValidator,
  listMyBookingsValidator,
} from "../validators/booking.validator.js";

const router = Router();

router.use(authenticate);

// Only USER can create booking
router.post(
  "/",
  authorizeRoles("user"),
  createBookingValidator,
  validate,
  createBookingHandler
);

// Both user and provider can list their bookings
router.get(
  "/me",
  authorizeRoles("user", "provider"),
  listMyBookingsValidator,
  validate,
  getMyBookingsHandler
);

// Both user and provider can view booking details
router.get(
  "/:id",
  authorizeRoles("user", "provider"),
  bookingIdParamValidator,
  validate,
  getBookingByIdHandler
);

// Only PROVIDER can accept
router.patch(
  "/:id/accept",
  authorizeRoles("provider"),
  bookingIdParamValidator,
  validate,
  acceptBookingHandler
);

// Only PROVIDER can complete
router.patch(
  "/:id/complete",
  authorizeRoles("provider"),
  bookingIdParamValidator,
  validate,
  completeBookingHandler
);

// Both user and provider can cancel (validated in service)
router.patch(
  "/:id/cancel",
  authorizeRoles("user", "provider"),
  bookingIdParamValidator,
  cancelBookingValidator,
  validate,
  cancelBookingHandler
);

// Both user and provider can view history
router.get(
  "/:id/history",
  authorizeRoles("user", "provider"),
  bookingIdParamValidator,
  validate,
  getBookingHistoryHandler
);

export default router;
