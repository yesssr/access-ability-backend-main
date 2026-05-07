/*
Header: Push Notification Service
Tujuan: Handle sending push notifications ke berbagai platform (web, Android, iOS).
Caller: Controllers, event handlers (booking, verification, etc).
Dependensi: web-push, firebase-admin, PushSubscription model, env config.
Main Functions: sendNotificationToUser, sendNotificationToMany, storageSubscription.
Side Effects: Publish notifications, log failures, update subscription data.
*/

import webpush from "web-push";
import { PushSubscription } from "../models/PushSubscription.js";
import { env } from "../config/env.js";

// Setup Web Push VAPID
webpush.setVapidDetails(
  "mailto:admin@access-ability.id",
  env.vapid.publicKey,
  env.vapid.privateKey
);

/**
 * Subscribe device pembaca notification
 * @param {string} userId - User ID
 * @param {string} platform - 'web' | 'android' | 'ios'
 * @param {string} token - Subscription token/endpoint
 * @param {object} data - Optional metadata (encryption keys untuk web)
 */
export const storeSubscription = async (
  userId,
  platform,
  token,
  data = null
) => {
  try {
    const existing = await PushSubscription.query()
      .where("user_id", userId)
      .where("platform", platform)
      .where("token", token)
      .first();

    if (existing) {
      // Update timestamp
      return await existing.$query().patch({ updated_at: new Date() });
    }

    // Insert baru
    return await PushSubscription.query().insert({
      user_id: userId,
      platform,
      token,
      data,
    });
  } catch (error) {
    console.error("[PushService] Failed to store subscription:", error.message);
    throw error;
  }
};

/**
 * Get semua subscriptions user
 * @param {string} userId
 * @returns {Promise<Array>}
 */
export const getUserSubscriptions = async (userId) => {
  try {
    return await PushSubscription.query().where("user_id", userId);
  } catch (error) {
    console.error("[PushService] Failed to get subscriptions:", error.message);
    return [];
  }
};

/**
 * Send Web Push notification
 * @param {object} subscription - Web Push subscription object
 * @param {object} payload - Notification payload
 */
const sendWebPush = async (subscription, payload) => {
  try {
    // Parse token jika string (stored sebagai JSON)
    const subscriptionObj =
      typeof subscription.token === "string"
        ? JSON.parse(subscription.token)
        : subscription.token;

    await webpush.sendNotification(subscriptionObj, JSON.stringify(payload));
    console.log("[WebPush] Sent successfully");
  } catch (error) {
    if (error.statusCode === 410) {
      // Subscription expired, remove dari DB
      await PushSubscription.query().deleteById(subscription.id);
      console.log("[WebPush] Removed expired subscription");
    } else {
      console.error("[WebPush] Failed:", error.message);
    }
  }
};

/**
 * Send Android/iOS push via FCM/APNs (placeholder)
 * TODO: Implement Firebase C loudMessaging when mobile ready
 */
const sendMobilePush = async (subscription, payload) => {
  try {
    const { platform, token } = subscription;

    if (platform === "android") {
      // TODO: Firebase Cloud Messaging untuk Android
      console.log(`[FCM Android] Would send to: ${token.substring(0, 20)}...`);
    } else if (platform === "ios") {
      // TODO: APNs untuk iOS
      console.log(`[APNs iOS] Would send to: ${token.substring(0, 20)}...`);
    }

    // For now, just log
    console.log(
      `[MobilePush] Placeholder - real implementation pending mobile app`
    );
  } catch (error) {
    console.error("[MobilePush] Failed:", error.message);
  }
};

/**
 * Send notification to single user
 * @param {string} userId
 * @param {object} notification - { title, body, icon, badge, data }
 */
export const sendNotificationToUser = async (userId, notification) => {
  try {
    const subscriptions = await getUserSubscriptions(userId);

    if (subscriptions.length === 0) {
      console.log(`[PushService] No subscriptions found for user ${userId}`);
      return;
    }

    const promises = subscriptions.map((sub) => {
      if (sub.platform === "web") {
        return sendWebPush(sub, notification);
      } else {
        return sendMobilePush(sub, notification);
      }
    });

    await Promise.allSettled(promises);
    console.log(
      `[PushService] Sent notification to user ${userId} (${subscriptions.length} devices)`
    );
  } catch (error) {
    console.error("[PushService] Error sending notification:", error.message);
  }
};

/**
 * Send notification to multiple users
 * @param {array} userIds
 * @param {object} notification
 */
export const sendNotificationToMany = async (userIds, notification) => {
  try {
    const promises = userIds.map((userId) =>
      sendNotificationToUser(userId, notification)
    );

    await Promise.allSettled(promises);
    console.log(`[PushService] Sent notification to ${userIds.length} users`);
  } catch (error) {
    console.error(
      "[PushService] Error sending bulk notification:",
      error.message
    );
  }
};

/**
 * Remove expired/invalid subscription
 * @param {string} subscriptionId
 */
export const removeSubscription = async (subscriptionId) => {
  try {
    await PushSubscription.query().deleteById(subscriptionId);
    console.log(`[PushService] Removed subscription ${subscriptionId}`);
  } catch (error) {
    console.error(
      "[PushService] Failed to remove subscription:",
      error.message
    );
  }
};

export default {
  storeSubscription,
  getUserSubscriptions,
  sendNotificationToUser,
  sendNotificationToMany,
  removeSubscription,
};
