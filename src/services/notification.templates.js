/*
Tujuan: Menyediakan template payload push notification yang konsisten dan reusable.
Caller: service provider, booking, dan service domain lain yang mengirim FCM.
Dependensi: Tidak ada; hanya builder payload plain object untuk push.service.
Main Functions: buildPushPayload, buildProviderVerificationNotification, buildCertificationVerificationNotification.
Side Effects: Tidak ada. Modul ini murni builder data.
*/

const compactObject = (value) => {
  return Object.fromEntries(
    Object.entries(value).filter(
      ([, item]) => item !== undefined && item !== null
    )
  );
};

export const NOTIFICATION_TYPES = Object.freeze({
  BOOKING_CREATED: "booking_created",
  BOOKING_SUBMITTED: "booking_submitted",
  BOOKING_ACCEPTED: "booking_accepted",
  BOOKING_COMPLETED: "booking_completed",
  BOOKING_CANCELLED: "booking_cancelled",
  PROVIDER_VERIFICATION_APPROVED: "provider_verification_approved",
  CERTIFICATION_VERIFICATION_APPROVED: "verification_approved",
  CERTIFICATION_VERIFICATION_REJECTED: "verification_rejected",
});

export const buildPushPayload = ({
  title,
  body,
  tag,
  url,
  data = {},
  imageUrl,
  icon,
  badge,
}) => ({
  notification: compactObject({
    title,
    body,
    imageUrl,
    icon,
    badge,
    tag,
    url,
  }),
  data,
});

export const buildProviderVerificationNotification = ({ providerId }) => {
  return buildPushPayload({
    title: "Akun provider diverifikasi",
    body: "Akun provider Anda telah diverifikasi dan sekarang bisa digunakan.",
    tag: "provider-verification-approved",
    url: "/dashboard/provider",
    data: {
      type: NOTIFICATION_TYPES.PROVIDER_VERIFICATION_APPROVED,
      provider_id: providerId,
    },
  });
};

export const buildBookingCreatedNotification = ({ booking }) => {
  return buildPushPayload({
    title: "Booking baru",
    body: `Ada booking baru pada ${booking.booking_date} jam ${booking.start_time}-${booking.end_time}`,
    tag: "booking-new",
    url: "/dashboard/provider/permintaan-booking",
    data: {
      type: NOTIFICATION_TYPES.BOOKING_CREATED,
      booking_id: booking.id,
      booking_code: booking.booking_code,
    },
  });
};

export const buildBookingSubmittedNotification = ({ booking }) => {
  return buildPushPayload({
    title: "Booking terkirim",
    body: `Permintaan booking Anda untuk ${booking.booking_date} telah dikirim dan menunggu konfirmasi provider.`,
    tag: "booking-submitted",
    url: `/dashboard/user/booking/${booking.id}`,
    data: {
      type: NOTIFICATION_TYPES.BOOKING_SUBMITTED,
      booking_id: booking.id,
      booking_code: booking.booking_code,
    },
  });
};

export const buildBookingAcceptedNotification = ({ booking }) => {
  return buildPushPayload({
    title: "Booking diterima",
    body: `Provider telah menerima booking Anda untuk ${booking.booking_date}`,
    tag: "booking-accepted",
    url: `/dashboard/user/booking/${booking.id}`,
    data: {
      type: NOTIFICATION_TYPES.BOOKING_ACCEPTED,
      booking_id: booking.id,
      booking_code: booking.booking_code,
    },
  });
};

export const buildBookingCompletedNotification = ({ booking }) => {
  return buildPushPayload({
    title: "Booking selesai",
    body: `Booking untuk ${booking.booking_date} telah diselesaikan`,
    tag: "booking-completed",
    url: `/dashboard/user/booking/${booking.id}`,
    data: {
      type: NOTIFICATION_TYPES.BOOKING_COMPLETED,
      booking_id: booking.id,
      booking_code: booking.booking_code,
    },
  });
};

export const buildBookingCancelledNotification = ({
  booking,
  recipientRole,
  cancelReason,
}) => {
  const cancelledByProvider = recipientRole === "user";
  const notifMessage = cancelledByProvider
    ? "Provider membatalkan booking Anda"
    : "Booking Anda telah dibatalkan";

  return buildPushPayload({
    title: "Booking dibatalkan",
    body: notifMessage + (cancelReason ? `: ${cancelReason}` : ""),
    tag: "booking-cancelled",
    url: `/dashboard/${recipientRole}/bookings`,
    data: {
      type: NOTIFICATION_TYPES.BOOKING_CANCELLED,
      booking_id: booking.id,
      booking_code: booking.booking_code,
      reason: cancelReason,
    },
  });
};

export const buildCertificationVerificationNotification = ({
  certificationId,
  certificationName,
  isApproved,
}) => {
  const statusText = isApproved ? "Disetujui" : "Ditolak";
  const type = isApproved
    ? NOTIFICATION_TYPES.CERTIFICATION_VERIFICATION_APPROVED
    : NOTIFICATION_TYPES.CERTIFICATION_VERIFICATION_REJECTED;

  return buildPushPayload({
    title: `Sertifikat ${statusText}`,
    body: isApproved
      ? `Sertifikat untuk "${certificationName}" telah diverifikasi dan disetujui!`
      : `Sertifikat untuk "${certificationName}" tidak berhasil verifikasi. Silakan cek kembali dokumen Anda.`,
    tag: `certification-${certificationId}`,
    url: "/dashboard/provider/profil",
    data: {
      type,
      certification_id: certificationId,
      certification_name: certificationName,
    },
  });
};
