import { BaseModel } from "./BaseModel.js";
import { Provider } from "./Provider.js";
import { ServiceType } from "./ServiceType.js";

export class ProviderSpecialization extends BaseModel {
  static get tableName() {
    return this.table("provider_specializations");
  }

  static get autoFields() {
    return {
      uuidId: true,
      createdAt: true,
      updatedAt: false,
    };
  }

  static get relationMappings() {
    const schema = this.schemaName;

    return {
      providerProfile: {
        relation: BaseModel.BelongsToOneRelation,
        modelClass: Provider,
        join: {
          from: `${schema}.provider_specializations.provider_profile_id`,
          to: `${schema}.provider_profiles.id`,
        },
      },

      serviceType: {
        relation: BaseModel.BelongsToOneRelation,
        modelClass: ServiceType,
        join: {
          from: `${schema}.provider_specializations.service_type_id`,
          to: `${schema}.service_types.id`,
        },
      },
    };
  }
}
