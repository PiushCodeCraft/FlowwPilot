
import { Request, Response } from "express";
import mongoose from "mongoose";

import Organization from "../models/Organization";
import OrganizationMember from "../models/OrganizationMember";
import User from "../models/User";
import { OrganizationRequest } from "../middleware/organization.middleware";

// CREATE ORGANIZATION
export const createOrganization = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = (req as OrganizationRequest).userId;
    const { name } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 150) {
      res.status(400).json({
        success: false,
        message: "Organization name must be between 2 and 150 characters",
      });
      return;
    }

    const session = await mongoose.startSession();

    let createdOrganization: InstanceType<typeof Organization> | null = null;

    try {
      await session.withTransaction(async () => {
        const slugBase = name
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");

        const slug = `${slugBase}-${new mongoose.Types.ObjectId()
          .toString()
          .slice(-6)}`;

        const [organization] = await Organization.create(
          [{
            name: name.trim(),
            slug,
            owner: userId,
          }],
          { session }
        );

        await OrganizationMember.create(
          [{
            user: userId,
            organization: organization._id,
            role: "OWNER",
            status: "ACTIVE",
          }],
          { session }
        );

        createdOrganization = organization;
      });
    } finally {
      await session.endSession();
    }

    if (!createdOrganization) {
      throw new Error("Organization creation failed");
    }

    res.status(201).json({
      success: true,
      message: "Organization created successfully",
      data: createdOrganization,
    });
  } catch (error) {
    console.error("Create organization error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to create organization",
    });
  }
};

// GET USER ORGANIZATIONS
export const getMyOrganizations = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = (req as OrganizationRequest).userId;

    const memberships = await OrganizationMember.find({
      user: userId,
      status: "ACTIVE",
    })
      .populate("organization", "name slug status owner createdAt")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: memberships.length,
      data: memberships,
    });
  } catch (error) {
    console.error("Get organizations error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to fetch organizations",
    });
  }
};

// GET ORGANIZATION DETAILS
export const getOrganizationDetails = async (
  req: OrganizationRequest,
  res: Response
): Promise<void> => {
  try {
    const organization = await Organization.findById(
      req.organizationId
    );

    res.status(200).json({
      success: true,
      data: {
        organization,
        role: req.organizationRole,
      },
    });
  } catch (error) {
    console.error("Organization details error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to fetch organization details",
    });
  }
};

// GET ORGANIZATION MEMBERS
export const getOrganizationMembers = async (
  req: OrganizationRequest,
  res: Response
): Promise<void> => {
  try {
    const members = await OrganizationMember.find({
      organization: req.organizationId,
      status: "ACTIVE",
    })
      .populate("user", "name email systemRole")
      .sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      count: members.length,
      data: members,
    });
  } catch (error) {
    console.error("Get members error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to fetch organization members",
    });
  }
};

// ADD EXISTING USER TO ORGANIZATION
export const addOrganizationMember = async (
  req: OrganizationRequest,
  res: Response
): Promise<void> => {
  try {
    const { email, role } = req.body;

    if (typeof email !== "string" || !email.trim()) {
      res.status(400).json({
        success: false,
        message: "A valid email address is required",
      });
      return;
    }

if (role !== "MEMBER") {
   res.status(400).json({
    success: false,
    message: "Only MEMBER role can be assigned",
  });
}

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
      isActive: true,
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: "No active user found with this email",
      });
      return;
    }

    const existingMembership = await OrganizationMember.findOne({
      user: user._id,
      organization: req.organizationId,
    });

    if (existingMembership) {
      res.status(409).json({
        success: false,
        message: "User is already associated with this organization",
      });
      return;
    }

    const membership = await OrganizationMember.create({
      user: user._id,
      organization: req.organizationId,
      role,
      status: "ACTIVE",
    });

    res.status(201).json({
      success: true,
      message: "Organization member added successfully",
      data: membership,
    });
  } catch (error) {
    console.error("Add member error:", error);

    if (
      error instanceof mongoose.mongo.MongoServerError &&
      error.code === 11000
    ) {
      res.status(409).json({
        success: false,
        message: "User is already a member of this organization",
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: "Unable to add organization member",
    });
  }
};
