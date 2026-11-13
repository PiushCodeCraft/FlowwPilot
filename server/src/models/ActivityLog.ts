
import mongoose, { Schema, Document, Types } from "mongoose";

export interface IActivityLog extends Document {
  organization: Types.ObjectId;
  user: Types.ObjectId;
  action: string;
  description: string;
  request?: Types.ObjectId;
  workflow?: Types.ObjectId;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const activityLogSchema = new Schema<IActivityLog>(
  {
    organization: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },

    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    action: {
      type: String,
      required: true,
      enum: [
        "WORKFLOW_CREATED",
        "WORKFLOW_UPDATED",
        "REQUEST_SUBMITTED",
        "REQUEST_APPROVED",
        "REQUEST_REJECTED",
        "MEMBER_ADDED",
        "MEMBER_REMOVED",
      ],
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    request: {
      type: Schema.Types.ObjectId,
      ref: "WorkflowRequest",
    },

    workflow: {
      type: Schema.Types.ObjectId,
      ref: "Workflow",
    },

    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

activityLogSchema.index({
  organization: 1,
  createdAt: -1,
});

const ActivityLog =
  mongoose.models.ActivityLog ||
  mongoose.model<IActivityLog>("ActivityLog", activityLogSchema);

export default ActivityLog;
