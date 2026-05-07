/*
Tujuan: Mencatat hasil scoring rekomendasi provider untuk audit dan histori pengguna.
Caller: matching.service.
Dependensi: BaseModel, User, ServiceType, Provider.
Main Functions: tableName, autoFields, relationMappings, jsonSchema.
Side Effects: Validasi struktur log matching dan relasi baca lintas tabel.
*/

import { BaseModel } from "./BaseModel.js";
import { User } from "./User.js";
import { ServiceType } from "./ServiceType.js";
import { Provider } from "./Provider.js";

export class AiMatchingLog extends BaseModel {
  static get tableName() {
    return this.table("ai_matching_logs");
  }

  static get autoFields() {
    return {
      uuidId: true,
      createdAt: true,
      updatedAt: false,
    };
  }

  static get relationMappings() {
    return {
      user: {
        relation: BaseModel.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: `${this.schemaName}.ai_matching_logs.user_id`,
          to: `${this.schemaName}.users.id`,
        },
      },
      requestedServiceType: {
        relation: BaseModel.BelongsToOneRelation,
        modelClass: ServiceType,
        join: {
          from: `${this.schemaName}.ai_matching_logs.requested_service_type_id`,
          to: `${this.schemaName}.service_types.id`,
        },
      },
      providerProfile: {
        relation: BaseModel.BelongsToOneRelation,
        modelClass: Provider,
        join: {
          from: `${this.schemaName}.ai_matching_logs.provider_profile_id`,
          to: `${this.schemaName}.provider_profiles.id`,
        },
      },
    };
  }

  static get jsonSchema() {
    return {
      type: "object",
      required: [
        "user_id",
        "requested_service_type_id",
        "provider_profile_id",
        "score_total",
        "score_breakdown",
      ],
      properties: {
        id: { type: "string", format: "uuid" },
        user_id: { type: "string", format: "uuid" },
        requested_service_type_id: { type: "integer" },
        requested_regency_id: { type: ["string", "null"], maxLength: 8 },
        requested_city: { type: ["string", "null"], maxLength: 100 },
        requested_date: { type: ["string", "null"], format: "date" },
        requested_start_time: {
          type: ["string", "null"],
          pattern: "^([01]\\d|2[0-3]):([0-5]\\d)(:[0-5]\\d)?$",
        },
        requested_duration_hours: { type: ["number", "null"], minimum: 0 },
        provider_profile_id: { type: "string", format: "uuid" },
        score_total: { type: "number", minimum: 0, maximum: 1 },
        score_breakdown: { type: "object" },
        created_at: { type: ["string", "null"] },
      },
    };
  }
}
