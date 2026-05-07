import { BaseModel } from "./BaseModel.js";
import { Booking } from "./Booking.js";
import { User } from "./User.js";

export class BookingStatusHistory extends BaseModel {
  static get tableName() {
    return this.table("booking_status_histories");
  }

  static get autoFields() {
    return {
      uuidId: true,
      createdAt: false,
      updatedAt: false,
    };
  }

  static get relationMappings() {
    const schema = this.schemaName;

    return {
      booking: {
        relation: BaseModel.BelongsToOneRelation,
        modelClass: Booking,
        join: {
          from: `${schema}.booking_status_histories.booking_id`,
          to: `${schema}.bookings.id`,
        },
      },
      changedByUser: {
        relation: BaseModel.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: `${schema}.booking_status_histories.changed_by`,
          to: `${schema}.users.id`,
        },
      },
    };
  }
}
