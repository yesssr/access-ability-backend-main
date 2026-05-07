/*
Header: Push Subscription Model
Tujuan: ORM model untuk tabel push_subscriptions (simpan subscription tokens).
Caller: Push service, push controller.
Dependensi: objection.js.
Main Functions: Relationship dengan User, CRUD operations.
Side Effects: Database queries untuk manage subscriptions.
*/

import { BaseModel } from "./BaseModel.js";

export class PushSubscription extends BaseModel {
  static get tableName() {
    return "push_subscriptions";
  }

  static get jsonSchema() {
    return {
      type: "object",
      required: ["user_id", "platform", "token"],
      properties: {
        id: { type: "string", format: "uuid" },
        user_id: { type: "string", format: "uuid" },
        platform: { type: "string", enum: ["web", "android", "ios"] },
        token: { type: "string" },
        data: { type: "object" },
        created_at: { type: "string" },
        updated_at: { type: "string" },
      },
    };
  }

  static get relationMappings() {
    return {
      user: {
        relation: BaseModel.BelongsToOneRelation,
        modelClass: "./User.js",
        join: {
          from: "push_subscriptions.user_id",
          to: "users.id",
        },
      },
    };
  }
}
