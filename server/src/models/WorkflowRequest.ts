
import mongoose, { Schema, Document, Types } from "mongoose";

export interface IRequestStage {
  order: number;
  name: string;
  approver: Types.ObjectId;
  status: "PENDING" | "APPROVED" | "REJECTED" | "SKIPPED";
  actedAt?: Date;
}

export interface IWorkflowRequest extends Document {
  organization: Types.ObjectId;
  workflow: Types.ObjectId;
  submittedBy: Types.ObjectId;
  title: string;
  formData: Map<string, unknown>;
  stages: IRequestStage[];
  currentStageOrder: number;
  status: "SUBMITTED" | "IN_PROGRESS" | "APPROVED" | "REJECTED";
  submittedAt: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const workflowRequestSchema = new Schema<IWorkflowRequest>(
  {
    organization: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },

    workflow: {
      type: Schema.Types.ObjectId,
      ref: "Workflow",
      required: true,
    },

    submittedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    formData: {
      type: Map,
      of: Schema.Types.Mixed,
      default: {},
    },

    stages: [
      {
        order: {
          type: Number,
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        approver: {
          type: Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        status: {
          type: String,
          enum: ["PENDING", "APPROVED", "REJECTED", "SKIPPED"],
          default: "PENDING",
        },
        actedAt: Date,
      },
    ],

    currentStageOrder: {
      type: Number,
      default: 1,
      min: 1,
    },

    status: {
      type: String,
      enum: ["SUBMITTED", "IN_PROGRESS", "APPROVED", "REJECTED"],
      default: "SUBMITTED",
      index: true,
    },

    submittedAt: {
      type: Date,
      default: Date.now,
    },

    completedAt: Date,
  },
  {
    timestamps: true,
  }
);

workflowRequestSchema.index({
  organization: 1,
  submittedBy: 1,
  createdAt: -1,
});

workflowRequestSchema.index({
  organization: 1,
  status: 1,
});

const WorkflowRequest =
  mongoose.models.WorkflowRequest ||
  mongoose.model<IWorkflowRequest>(
    "WorkflowRequest",
    workflowRequestSchema
  );

export default WorkflowRequest;
