
import mongoose, { Schema, Document, Types } from "mongoose";

export interface IWorkflowStage {
  order: number;
  name: string;
  approver: Types.ObjectId;
}

export interface IWorkflowFormField {
  name: string;
  label: string;
  type: "TEXT" | "NUMBER" | "DATE" | "SELECT" | "TEXTAREA";
  required: boolean;
  options?: string[];
}

export interface IWorkflow extends Document {
  organization: Types.ObjectId;
  name: string;
  description: string;
  category: string;
  formFields: IWorkflowFormField[];
  stages: IWorkflowStage[];
  status: "ACTIVE" | "INACTIVE";
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const workflowSchema = new Schema<IWorkflow>(
  {
    organization: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    category: {
      type: String,
      required: true,
      trim: true,
    },

    formFields: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
        },
        label: {
          type: String,
          required: true,
        },
        type: {
          type: String,
          enum: ["TEXT", "NUMBER", "DATE", "SELECT", "TEXTAREA"],
          required: true,
        },
        required: {
          type: Boolean,
          default: false,
        },
        options: {
          type: [String],
          default: undefined,
        },
      },
    ],

    stages: [
      {
        order: {
          type: Number,
          required: true,
          min: 1,
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
      },
    ],

    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate workflow names within an organization
workflowSchema.index(
  { organization: 1, name: 1 },
  { unique: true }
);

const Workflow =
  mongoose.models.Workflow ||
  mongoose.model<IWorkflow>("Workflow", workflowSchema);

export default Workflow;
