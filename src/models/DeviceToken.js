/*
Tujuan: ORM model token FCM yang terdaftar untuk user web/mobile.
Caller: push.service saat register, unregister, query recipient, dan cleanup token invalid.
Dependensi: BaseModel dan relasi User.
Main Functions: tableName, jsonSchema, relationMappings.
Side Effects: Validasi struktur data device_tokens pada operasi DB.
*/

import { BaseModel } from "./BaseModel.js";
import { User } from "./User.js";

export class DeviceToken extends BaseModel {
  static get tableName() {
    return this.table("device_tokens");
  }

  static get jsonSchema() {
    return {
      type: "object",
      required: ["user_id", "platform", "token", "is_active"],
      properties: {
        id: { type: "string", format: "uuid" },
        user_id: { type: "string", format: "uuid" },
        platform: { type: "string", enum: ["web", "android", "ios"] },
        token: { type: "string", minLength: 20 },
        metadata: { type: ["object", "null"] },
        is_active: { type: "boolean" },
        last_seen_at: { type: ["string", "null"], format: "date-time" },
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
          from: `${schema}.device_tokens.user_id`,
          to: `${schema}.users.id`,
        },
      },
    };
  }
}
