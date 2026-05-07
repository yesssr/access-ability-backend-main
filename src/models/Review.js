import { BaseModel } from "./BaseModel.js";
import { Booking } from "./Booking.js";
import { User } from "./User.js";
import { Provider } from "./Provider.js";

export class Review extends BaseModel {
  static get tableName() {
    return this.table("reviews");
  }

  static get jsonSchema() {
    return {
      type: "object",
      required: [
        "booking_id",
        "reviewer_user_id",
        "provider_profile_id",
        "rating",
      ],
      properties: {
        id: { type: "string", format: "uuid" },
        booking_id: { type: "string", format: "uuid" },
        reviewer_user_id: { type: "string", format: "uuid" },
        provider_profile_id: { type: "string", format: "uuid" },
        rating: { type: "integer", minimum: 1, maximum: 5 },
        comment: { type: ["string", "null"], maxLength: 5000 },
        created_at: { type: ["string", "null"], format: "date-time" },
        updated_at: { type: ["string", "null"], format: "date-time" },
      },
    };
  }

  static get relationMappings() {
    const schema = this.schemaName;

    return {
      booking: {
        relation: BaseModel.BelongsToOneRelation,
        modelClass: Booking,
        join: {
          from: `${schema}.reviews.booking_id`,
          to: `${schema}.bookings.id`,
        },
      },
      reviewer: {
        relation: BaseModel.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: `${schema}.reviews.reviewer_user_id`,
          to: `${schema}.users.id`,
        },
      },
      providerProfile: {
        relation: BaseModel.BelongsToOneRelation,
        modelClass: Provider,
        join: {
          from: `${schema}.reviews.provider_profile_id`,
          to: `${schema}.provider_profiles.id`,
        },
      },
    };
  }
}
