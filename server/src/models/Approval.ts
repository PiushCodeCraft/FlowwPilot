
import mongoose, { Schema, Document, Types } from "mongoose";

export interface IApproval extends Document {
  organization: Types.ObjectId;
  request: Types.ObjectId;
  approver: Types.ObjectId;
  stageOrder: number;
  stageName: string;
  decision: "APPROVED" | "REJECTED";
  comments?: string;
  decidedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const approvalSchema = new Schema<IApproval>(
  {
    organization: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },

    request: {
      type: Schema.Types.ObjectId,
      ref: "WorkflowRequest",
      required: true,
    },

    approver: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    stageOrder: {
      type: Number,
      required: true,
      min: 1,
    },

    stageName: {
      type: String,
      required: true,
    },

    decision: {
      type: String,
      enum: ["APPROVED", "REJECTED"],
      required: true,
    },

    comments: {
      type: String,
      trim: true,
      maxlength: 1000,
    },

    decidedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// One decision per request stage
approvalSchema.index(
  { request: 1, stageOrder: 1 },
  { unique: true }
);

approvalSchema.index({
  organization: 1,
  approver: 1,
  decidedAt: -1,
});

const Approval =
  mongoose.models.Approval ||
  mongoose.model<IApproval>("Approval", approvalSchema);

export default Approval;
