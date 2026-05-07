/*
Tujuan: Mendefinisikan entitas profil provider beserta relasi domain utamanya.
Caller: service auth/provider/review/matching dan query relasional Objection.
Dependensi: BaseModel, User, ProviderSpecialization, ProviderCertification, ProviderAvailability, Booking, Review, AiMatchingLog.
Main Functions: tableName, jsonSchema, relationMappings.
Side Effects: Validasi struktur data provider pada operasi query/insert/update.
*/

import { BaseModel } from "./BaseModel.js";
import { User } from "./User.js";
import { ProviderSpecialization } from "./ProviderSpecialization.js";
import { ProviderCertification } from "./ProviderCertification.js";
import { ProviderAvailability } from "./ProviderAvailability.js";
import { Booking } from "./Booking.js";
import { Review } from "./Review.js";
import { AiMatchingLog } from "./AiMatchingLog.js";

export class Provider extends BaseModel {
  static get tableName() {
    return this.table("provider_profiles");
  }

  static get jsonSchema() {
    return {
      type: "object",
      required: [
        "user_id",
        "province_id",
        "province_name",
        "regency_id",
        "regency_name",
        "price_per_hour",
      ],
      properties: {
        id: { type: "string", format: "uuid" },
        user_id: { type: "string", format: "uuid" },
        bio: { type: ["string", "null"], maxLength: 5000 },
        years_experience: { type: ["integer", "null"], minimum: 0 },
        province_id: { type: "string", minLength: 1, maxLength: 8 },
        province_name: { type: "string", minLength: 2, maxLength: 120 },
        regency_id: { type: "string", minLength: 1, maxLength: 8 },
        regency_name: { type: "string", minLength: 2, maxLength: 140 },
        base_location_city: { type: "string", minLength: 2, maxLength: 100 },
        base_location_lat: { type: ["number", "null"] },
        base_location_lng: { type: ["number", "null"] },
        price_per_hour: { type: "number", exclusiveMinimum: 0 },
        is_verified: { type: "boolean" },
        verification_status: {
          type: "string",
          enum: ["pending", "approved", "rejected"],
        },
        verified_by: { type: ["string", "null"], format: "uuid" },
        verified_at: { type: ["string", "null"], format: "date-time" },
        avg_rating: { type: "number", minimum: 0, maximum: 5 },
        total_reviews: { type: "integer", minimum: 0 },
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
          from: `${schema}.provider_profiles.user_id`,
          to: `${schema}.users.id`,
        },
      },

      verifier: {
        relation: BaseModel.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: `${schema}.provider_profiles.verified_by`,
          to: `${schema}.users.id`,
        },
      },

      specializations: {
        relation: BaseModel.HasManyRelation,
        modelClass: ProviderSpecialization,
        join: {
          from: `${schema}.provider_profiles.id`,
          to: `${schema}.provider_specializations.provider_profile_id`,
        },
      },

      certifications: {
        relation: BaseModel.HasManyRelation,
        modelClass: ProviderCertification,
        join: {
          from: `${schema}.provider_profiles.id`,
          to: `${schema}.provider_certifications.provider_profile_id`,
        },
      },

      availabilities: {
        relation: BaseModel.HasManyRelation,
        modelClass: ProviderAvailability,
        join: {
          from: `${schema}.provider_profiles.id`,
          to: `${schema}.provider_availabilities.provider_profile_id`,
        },
      },

      bookings: {
        relation: BaseModel.HasManyRelation,
        modelClass: Booking,
        join: {
          from: `${schema}.provider_profiles.id`,
          to: `${schema}.bookings.provider_profile_id`,
        },
      },

      reviews: {
        relation: BaseModel.HasManyRelation,
        modelClass: Review,
        join: {
          from: `${schema}.provider_profiles.id`,
          to: `${schema}.reviews.provider_profile_id`,
        },
      },

      aiMatchingLogs: {
        relation: BaseModel.HasManyRelation,
        modelClass: AiMatchingLog,
        join: {
          from: `${schema}.provider_profiles.id`,
          to: `${schema}.ai_matching_logs.provider_profile_id`,
        },
      },
    };
  }
}
