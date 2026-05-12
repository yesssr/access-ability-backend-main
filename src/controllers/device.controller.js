/*
Tujuan: Adapter HTTP untuk registrasi, unregister, dan test push notification FCM.
Caller: devices.routes untuk endpoint /api/v1/devices.
Dependensi: push.service dan req.user dari auth middleware.
Main Functions: registerDevice, unregisterDevice, sendTestNotification.
Side Effects: DB write device_tokens dan HTTP call FCM saat test notification.
*/

import {
  registerToken,
  sendNotificationToUser,
  unregisterToken,
} from "../services/push.service.js";

const getUserId = (user) => user?.sub || user?.id;

export const registerDevice = async (req, res, next) => {
  try {
    const deviceToken = await registerToken(req.user, req.body);
    return res.status(201).json({
      success: true,
      message: "Device token registered",
      data: {
        device_token: {
          id: deviceToken.id,
          platform: deviceToken.platform,
          is_active: deviceToken.is_active,
          last_seen_at: deviceToken.last_seen_at,
        },
      },
    });
  } catch (err) {
    return next(err);
  }
};

export const unregisterDevice = async (req, res, next) => {
  try {
    const result = await unregisterToken(req.user, req.body.token);
    return res.status(200).json({
      success: true,
      message: "Device token unregistered",
      data: result,
    });
  } catch (err) {
    return next(err);
  }
};

export const sendTestNotification = async (req, res, next) => {
  try {
    const result = await sendNotificationToUser(getUserId(req.user), {
      notification: {
        title: req.body.title || "Access Ability",
        body: req.body.body || "Test notification berhasil dikirim.",
        tag: "test-notification",
        url: "/",
      },
      data: {
        type: "test_notification",
      },
    });

    return res.status(200).json({
      success: true,
      message: "Test notification processed",
      data: result,
    });
  } catch (err) {
    return next(err);
  }
};
