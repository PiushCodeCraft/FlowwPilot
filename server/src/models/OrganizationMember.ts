
import mongoose, { Schema, Document, Types } from "mongoose";

export interface IOrganizationMember extends Document {
  user: Types.ObjectId;
  organization: Types.ObjectId;
  role: "OWNER" | "ADMIN" | "MEMBER";
  status: "ACTIVE" | "INVITED" | "INACTIVE";
  joinedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const organizationMemberSchema =
  new Schema<IOrganizationMember>(
    {
      user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },

      organization: {
        type: Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
      },

      role: {
        type: String,
        enum: ["OWNER", "ADMIN", "MEMBER"],
        default: "MEMBER",
      },

      status: {
        type: String,
        enum: ["ACTIVE", "INVITED", "INACTIVE"],
        default: "ACTIVE",
      },

      joinedAt: {
        type: Date,
        default: Date.now,
      },
    },
    {
      timestamps: true,
    }
  );

// Prevent duplicate membership
organizationMemberSchema.index(
  { user: 1, organization: 1 },
  { unique: true }
);

const OrganizationMember =
  mongoose.models.OrganizationMember ||
  mongoose.model<IOrganizationMember>(
    "OrganizationMember",
    organizationMemberSchema
  );

export default OrganizationMember;
