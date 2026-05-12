/*
Tujuan: Mengelola token device dan mengirim push notification FCM untuk web/android/ios.
Caller: device.controller untuk registrasi/test token dan booking.service untuk event booking.
Dependensi: firebase-admin, env, DeviceToken.
Main Functions: registerToken, unregisterToken, sendToToken, sendNotificationToUser, sendNotificationToMany, cleanupTokens.
Side Effects: DB read/write device_tokens, HTTP call ke Firebase Cloud Messaging, cleanup token invalid.
*/

import admin from "firebase-admin";
import { env } from "../config/env.js";
import { DeviceToken } from "../models/DeviceToken.js";

const INVALID_TOKEN_CODES = new Set([
  "messaging/invalid-argument",
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
]);

const makeError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

const getUserId = (user) => user?.sub || user?.id;

const stringifyData = (data = {}) => {
  return Object.fromEntries(
    Object.entries(data)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => [key, String(value)])
  );
};

const compactObject = (value) => {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined)
  );
};

const buildNotification = (notification) =>
  compactObject({
    title: notification.title,
    body: notification.body,
    imageUrl: notification.imageUrl,
  });

const buildWebpushNotification = (notification) =>
  compactObject({
    title: notification.title,
    body: notification.body,
    icon: notification.icon,
    badge: notification.badge,
    tag: notification.tag,
  });

const buildCredential = () => {
  if (env.firebase.serviceAccount) {
    return admin.credential.cert(env.firebase.serviceAccount);
  }

  if (
    env.firebase.projectId &&
    env.firebase.clientEmail &&
    env.firebase.privateKey
  ) {
    return admin.credential.cert({
      projectId: env.firebase.projectId,
      clientEmail: env.firebase.clientEmail,
      privateKey: env.firebase.privateKey,
    });
  }

  if (env.firebase.applicationCredentials) {
    return admin.credential.applicationDefault();
  }

  return admin.credential.applicationDefault();
};

export const initializeFirebase = () => {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  if (!env.firebase.enabled) {
    return null;
  }

  return admin.initializeApp({
    credential: buildCredential(),
    projectId: env.firebase.projectId || undefined,
  });
};

const getMessaging = () => {
  const app = initializeFirebase();
  if (!app) {
    return null;
  }

  return admin.messaging(app);
};

export const registerToken = async (user, payload) => {
  const userId = getUserId(user);
  const now = new Date().toISOString();

  const existing = await DeviceToken.query().findOne({ token: payload.token });
  if (existing) {
    return DeviceToken.query().patchAndFetchById(existing.id, {
      user_id: userId,
      platform: payload.platform,
      metadata: payload.metadata ?? null,
      is_active: true,
      last_seen_at: now,
    });
  }

  return DeviceToken.query().insertAndFetch({
    user_id: userId,
    platform: payload.platform,
    token: payload.token,
    metadata: payload.metadata ?? null,
    is_active: true,
    last_seen_at: now,
  });
};

export const unregisterToken = async (user, token) => {
  const userId = getUserId(user);
  const existing = await DeviceToken.query().findOne({
    user_id: userId,
    token,
    is_active: true,
  });

  if (!existing) {
    return { deactivated: false };
  }

  await DeviceToken.query().patchAndFetchById(existing.id, {
    is_active: false,
  });

  return { deactivated: true };
};

export const cleanupTokens = async (tokens) => {
  const uniqueTokens = [...new Set(tokens)].filter(Boolean);
  if (uniqueTokens.length === 0) {
    return 0;
  }

  return DeviceToken.query()
    .patch({ is_active: false })
    .whereIn("token", uniqueTokens);
};

const buildMessage = ({ token, notification, data }) => ({
  token,
  notification: buildNotification(notification),
  data: stringifyData(data),
  webpush: {
    notification: buildWebpushNotification(notification),
    fcmOptions: notification.url ? { link: notification.url } : undefined,
  },
  android: {
    priority: "high",
    notification: buildNotification(notification),
  },
  apns: {
    payload: {
      aps: {
        sound: "default",
      },
    },
  },
});

export const sendToToken = async (token, payload) => {
  const messaging = getMessaging();
  if (!messaging) {
    return { sent: 0, skipped: 1, reason: "firebase_not_configured" };
  }

  try {
    await messaging.send(
      buildMessage({
        token,
        notification: payload.notification,
        data: payload.data,
      })
    );
    return { sent: 1, failed: 0 };
  } catch (err) {
    if (INVALID_TOKEN_CODES.has(err.code)) {
      await cleanupTokens([token]);
    }
    throw err;
  }
};

export const sendToMultipleTokens = async (tokens, payload) => {
  const uniqueTokens = [...new Set(tokens)].filter(Boolean);
  if (uniqueTokens.length === 0) {
    return { sent: 0, failed: 0, invalidTokens: [] };
  }

  const messaging = getMessaging();
  if (!messaging) {
    return {
      sent: 0,
      failed: 0,
      skipped: uniqueTokens.length,
      reason: "firebase_not_configured",
      invalidTokens: [],
    };
  }

  let sent = 0;
  let failed = 0;
  const invalidTokens = [];

  for (let index = 0; index < uniqueTokens.length; index += 500) {
    const batchTokens = uniqueTokens.slice(index, index + 500);
    const response = await messaging.sendEachForMulticast({
      tokens: batchTokens,
      notification: buildNotification(payload.notification),
      data: stringifyData(payload.data),
      webpush: {
        notification: buildWebpushNotification(payload.notification),
        fcmOptions: payload.notification.url
          ? { link: payload.notification.url }
          : undefined,
      },
      android: {
        priority: "high",
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
          },
        },
      },
    });

    sent += response.successCount;
    failed += response.failureCount;

    response.responses.forEach((item, responseIndex) => {
      if (item.error && INVALID_TOKEN_CODES.has(item.error.code)) {
        invalidTokens.push(batchTokens[responseIndex]);
      }
    });
  }

  if (invalidTokens.length > 0) {
    await cleanupTokens(invalidTokens);
  }

  return { sent, failed, invalidTokens };
};

export const sendNotificationToUser = async (userId, payload) => {
  if (!userId) {
    throw makeError(422, "userId is required");
  }

  const tokens = await DeviceToken.query()
    .select("token")
    .where("user_id", userId)
    .where("is_active", true);

  return sendToMultipleTokens(
    tokens.map((item) => item.token),
    payload
  );
};

export const sendNotificationToMany = async (userIds, payload) => {
  const uniqueUserIds = [...new Set(userIds)].filter(Boolean);
  if (uniqueUserIds.length === 0) {
    return { sent: 0, failed: 0, invalidTokens: [] };
  }

  const tokens = await DeviceToken.query()
    .select("token")
    .whereIn("user_id", uniqueUserIds)
    .where("is_active", true);

  return sendToMultipleTokens(
    tokens.map((item) => item.token),
    payload
  );
};
