import { BaseModel } from "./BaseModel.js";
import { User } from "./User.js";
import { Provider } from "./Provider.js";
import { ServiceType } from "./ServiceType.js";
import { BookingStatusHistory } from "./BookingStatusHistory.js";
import { Review } from "./Review.js";

export class Booking extends BaseModel {
  static get tableName() {
    return this.table("bookings");
  }

  static get jsonSchema() {
    return {
      type: "object",
      required: [
        "booking_code",
        "user_id",
        "provider_profile_id",
        "service_type_id",
        "booking_date",
        "start_time",
        "end_time",
        "duration_hours",
        "price_per_hour_snapshot",
        "price_estimate",
        "total_price",
      ],
      properties: {
        id: { type: "string", format: "uuid" },
        booking_code: { type: "string", minLength: 1, maxLength: 30 },
        user_id: { type: "string", format: "uuid" },
        provider_profile_id: { type: "string", format: "uuid" },
        service_type_id: { type: "integer" },
        booking_date: { type: "string", format: "date" },
        start_time: {
          type: "string",
          pattern: "^([01]\\d|2[0-3]):([0-5]\\d)(:[0-5]\\d)?$",
        },
        end_time: {
          type: "string",
          pattern: "^([01]\\d|2[0-3]):([0-5]\\d)(:[0-5]\\d)?$",
        },
        duration_hours: { type: "number", exclusiveMinimum: 0 },
        location_lat: { type: ["number", "null"] },
        location_lng: { type: ["number", "null"] },
        price_per_hour_snapshot: { type: "number", exclusiveMinimum: 0 },
        price_estimate: { type: "number", exclusiveMinimum: 0 },
        total_price: { type: "number", exclusiveMinimum: 0 },
        status: {
          type: "string",
          enum: ["pending", "accepted", "completed", "cancelled"],
        },
        request_notes: { type: ["string", "null"] },
        cancel_reason: { type: ["string", "null"] },
        accepted_at: { type: ["string", "null"], format: "date-time" },
        completed_at: { type: ["string", "null"], format: "date-time" },
        cancelled_at: { type: ["string", "null"], format: "date-time" },
        created_at: { type: ["string", "null"], format: "date-time" },
        updated_at: { type: ["string", "null"], format: "date-time" },
      },
    };
  }

  static get relationMappings() {
    const schema = this.schemaName;

    return {
      user: {
        relation: BaseModel.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: `${schema}.bookings.user_id`,
          to: `${schema}.users.id`,
        },
      },

      providerProfile: {
        relation: BaseModel.BelongsToOneRelation,
        modelClass: Provider,
        join: {
          from: `${schema}.bookings.provider_profile_id`,
          to: `${schema}.provider_profiles.id`,
        },
      },

      serviceType: {
        relation: BaseModel.BelongsToOneRelation,
        modelClass: ServiceType,
        join: {
          from: `${schema}.bookings.service_type_id`,
          to: `${schema}.service_types.id`,
        },
      },

      statusHistories: {
        relation: BaseModel.HasManyRelation,
        modelClass: BookingStatusHistory,
        join: {
          from: `${schema}.bookings.id`,
          to: `${schema}.booking_status_histories.booking_id`,
        },
      },

      review: {
        relation: BaseModel.HasOneRelation,
        modelClass: Review,
        join: {
          from: `${schema}.bookings.id`,
          to: `${schema}.reviews.booking_id`,
        },
      },
    };
  }
}
