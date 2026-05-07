import { BaseModel } from "./BaseModel.js";
import { ProviderSpecialization } from "./ProviderSpecialization.js";
import { Booking } from "./Booking.js";
import { AiMatchingLog } from "./AiMatchingLog.js";

export class ServiceType extends BaseModel {
  static get tableName() {
    return this.table("service_types");
  }

  static get autoFields() {
    return {
      uuidId: false,
      createdAt: true,
      updatedAt: true,
    };
  }

  static get idColumn() {
    return "id";
  }

  static get jsonSchema() {
    return {
      type: "object",
      required: ["code", "name"],
      properties: {
        id: { type: "integer" },
        code: { type: "string", minLength: 1, maxLength: 50 },
        name: { type: "string", minLength: 1, maxLength: 100 },
        description: { type: ["string", "null"] },
        created_at: { type: ["string", "null"] },
        updated_at: { type: ["string", "null"] },
      },
    };
  }

  static get relationMappings() {
    const schema = this.schemaName;

    return {
      providerSpecializations: {
        relation: BaseModel.HasManyRelation,
        modelClass: ProviderSpecialization,
        join: {
          from: `${schema}.service_types.id`,
          to: `${schema}.provider_specializations.service_type_id`,
        },
      },
      bookings: {
        relation: BaseModel.HasManyRelation,
        modelClass: Booking,
        join: {
          from: `${schema}.service_types.id`,
          to: `${schema}.bookings.service_type_id`,
        },
      },
      aiMatchingLogs: {
        relation: BaseModel.HasManyRelation,
        modelClass: AiMatchingLog,
        join: {
          from: `${schema}.service_types.id`,
          to: `${schema}.ai_matching_logs.requested_service_type_id`,
        },
      },
    };
  }
}
