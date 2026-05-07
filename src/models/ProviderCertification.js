import { BaseModel } from "./BaseModel.js";
import { Provider } from "./Provider.js";
import { User } from "./User.js";

export class ProviderCertification extends BaseModel {
  static get tableName() {
    return this.table("provider_certifications");
  }

  static get relationMappings() {
    const schema = this.schemaName;

    return {
      providerProfile: {
        relation: BaseModel.BelongsToOneRelation,
        modelClass: Provider,
        join: {
          from: `${schema}.provider_certifications.provider_profile_id`,
          to: `${schema}.provider_profiles.id`,
        },
      },
      verifier: {
        relation: BaseModel.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: `${schema}.provider_certifications.verified_by`,
          to: `${schema}.users.id`,
        },
      },
    };
  }
}
