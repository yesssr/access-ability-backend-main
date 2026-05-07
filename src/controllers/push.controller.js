/*
Header: Push Notification Controller
Tujuan: Handle HTTP endpoints untuk push subscription dan testing.
Caller: Push routes.
Dependensi: push.service.js, auth middleware.
Main Functions: subscribe, sendTest.
Side Effects: Store subscriptions, send test notifications.
*/

import {
  storeSubscription,
  sendNotificationToUser,
} from "../services/push.service.js";

/**
 * POST /api/v1/push/subscribe
 * Subscribe device untuk menerima push notifications
 */
export const subscribe = async (req, res, next) => {
  try {
    const { platform, token } = req.body;
    const userId = req.user.id; // From auth middleware

    if (!platform || !token) {
      return res.status(400).json({
        success: false,
        message: "platform dan token harus diisi",
      });
    }

    if (!["web", "android", "ios"].includes(platform)) {
      return res.status(400).json({
        success: false,
        message: "platform harus: web, android, atau ios",
      });
    }

    // Untuk web, token adalah JSON subscription object
    let data = null;
    if (platform === "web" && typeof token === "object") {
      data = {
        p256dh: token.keys?.p256dh,
        auth: token.keys?.auth,
      };
    }

    await storeSubscription(userId, platform, token, data);

    return res.status(201).json({
      success: true,
      message: "Subscription berhasil disimpan",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/push/send-test
 * Send test notification (untuk development/debugging)
 * Admin only atau user untuk notif mereka sendiri
 */
export const sendTest = async (req, res, next) => {
  try {
    const { title, body } = req.body;
    const userId = req.user.id;

    if (!title || !body) {
      return res.status(400).json({
        success: false,
        message: "title dan body harus diisi",
      });
    }

    await sendNotificationToUser(userId, {
      title,
      body,
      icon: "https://access-ability.vercel.app/logo.png",
      badge: "https://access-ability.vercel.app/badge.png",
      tag: "test",
      data: {
        type: "test",
        url: "/",
      },
    });

    return res.json({
      success: true,
      message: "Test notification sent",
    });
  } catch (error) {
    next(error);
  }
};

export default { subscribe, sendTest };
