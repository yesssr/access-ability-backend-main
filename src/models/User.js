import { BaseModel } from "./BaseModel.js";
import * as ProviderModel from "./Provider.js";

export class User extends BaseModel {
  static get tableName() {
    return "users";
  }

  static get jsonSchema() {
    return {
      type: "object",
      required: ["email", "full_name", "role"],
      properties: {
        id: { type: "string", format: "uuid" },
        email: { type: "string", minLength: 5, maxLength: 255 },
        password_hash: { type: ["string", "null"], minLength: 20, maxLength: 255 },
        full_name: { type: "string", minLength: 3, maxLength: 120 },
        phone_number: { type: ["string", "null"], maxLength: 30 },
        role: { type: "string", enum: ["user", "provider", "admin"] },
        is_active: { type: "boolean" },
        last_login_at: { type: ["string", "null"], format: "date-time" },
        google_id: { type: ["string", "null"], maxLength: 255 },
        oauth_provider: { type: ["string", "null"], maxLength: 50 },
        oauth_token_data: { type: ["object", "null"] },
        created_at: { type: ["string", "null"], format: "date-time" },
        updated_at: { type: ["string", "null"], format: "date-time" },
      },
    };
  }

  static get relationMappings() {
    return {
      providerProfile: {
        relation: BaseModel.HasOneRelation,
        modelClass: ProviderModel.Provider,
        join: {
          from: "users.id",
          to: "provider_profiles.user_id",
        },
      },

      bookings: {
        relation: BaseModel.HasManyRelation,
        modelClass: () => import("./Booking.js").then((m) => m.Booking),
        join: {
          from: "users.id",
          to: "bookings.user_id",
        },
      },

      reviews: {
        relation: BaseModel.HasManyRelation,
        modelClass: () => import("./Review.js").then((m) => m.Review),
        join: {
          from: "users.id",
          to: "reviews.reviewer_user_id",
        },
      },

      bookingStatusChanges: {
        relation: BaseModel.HasManyRelation,
        modelClass: () =>
          import("./BookingStatusHistory.js").then(
            (m) => m.BookingStatusHistory
          ),
        join: {
          from: "users.id",
          to: "booking_status_histories.changed_by",
        },
      },

      verifiedProviders: {
        relation: BaseModel.HasManyRelation,
        modelClass: ProviderModel.Provider,
        join: {
          from: "users.id",
          to: "provider_profiles.verified_by",
        },
      },

      verifiedCertifications: {
        relation: BaseModel.HasManyRelation,
        modelClass: () =>
          import("./ProviderCertification.js").then(
            (m) => m.ProviderCertification
          ),
        join: {
          from: "users.id",
          to: "provider_certifications.verified_by",
        },
      },

      matchingLogs: {
        relation: BaseModel.HasManyRelation,
        modelClass: () =>
          import("./AiMatchingLog.js").then((m) => m.AiMatchingLog),
        join: {
          from: "users.id",
          to: "ai_matching_logs.user_id",
        },
      },
    };
  }
}
