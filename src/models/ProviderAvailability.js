import { BaseModel } from "./BaseModel.js";
import { Provider } from "./Provider.js";

export class ProviderAvailability extends BaseModel {
  static get tableName() {
    return this.table("provider_availabilities");
  }

  static get jsonSchema() {
    return {
      type: "object",
      required: [
        "provider_profile_id",
        "day_of_week",
        "start_time",
        "end_time",
      ],
      properties: {
        id: { type: "string", format: "uuid" },
        provider_profile_id: { type: "string", format: "uuid" },
        day_of_week: { type: "integer", minimum: 0, maximum: 6 },
        start_time: {
          type: "string",
          pattern: "^([01]\\d|2[0-3]):([0-5]\\d)(:[0-5]\\d)?$",
        },
        end_time: {
          type: "string",
          pattern: "^([01]\\d|2[0-3]):([0-5]\\d)(:[0-5]\\d)?$",
        },
        is_active: { type: "boolean" },
        created_at: { type: ["string", "null"], format: "date-time" },
        updated_at: { type: ["string", "null"], format: "date-time" },
      },
    };
  }

  static get relationMappings() {
    const schema = this.schemaName;

    return {
      providerProfile: {
        relation: BaseModel.BelongsToOneRelation,
        modelClass: Provider,
        join: {
          from: `${schema}.provider_availabilities.provider_profile_id`,
          to: `${schema}.provider_profiles.id`,
        },
      },
    };
  }
}
