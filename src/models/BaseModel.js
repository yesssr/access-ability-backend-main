import { Model } from "objection";
import { randomUUID } from "crypto";

export class BaseModel extends Model {
  static get schemaName() {
    return process.env.DB_SCHEMA || "app_mvp";
  }

  static table(name) {
    return `${this.schemaName}.${name}`;
  }

  static get autoFields() {
    return {
      uuidId: true,
      createdAt: true,
      updatedAt: true,
    };
  }

  static get idColumn() {
    return "id";
  }

  $beforeInsert() {
    const now = new Date().toISOString();
    const autoFields = this.constructor.autoFields || {};

    if (autoFields.uuidId && !this.id) {
      this.id = randomUUID();
    }

    if (autoFields.createdAt && !this.created_at) {
      this.created_at = now;
    }

    if (autoFields.updatedAt && !this.updated_at) {
      this.updated_at = now;
    }
  }

  $beforeUpdate() {
    const autoFields = this.constructor.autoFields || {};
    if (autoFields.updatedAt) {
      this.updated_at = new Date().toISOString();
    }
  }
}
