
import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth.middleware";

import Organization from "../models/Organization";
import OrganizationMember from "../models/OrganizationMember";

export interface OrganizationRequest extends AuthRequest {
  organizationId?: string;
  organizationRole?: "OWNER" | "MEMBER";
}

export const requireOrganization = async (
  req: OrganizationRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId;
const rawOrganizationId = req.params.organizationId;

const organizationId = Array.isArray(rawOrganizationId)
  ? rawOrganizationId[0]
  : rawOrganizationId;

  if (
  typeof organizationId !== "string" ||
  !organizationId
) {
  res.status(400).json({
    success: false,
    message: "Organization ID is required",
  });
  return;
}

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    if (!organizationId) {
      res.status(400).json({
        success: false,
        message: "Organization ID is required",
      });
      return;
    }

    if (!/^[0-9a-fA-F]{24}$/.test(organizationId)) {
      res.status(400).json({
        success: false,
        message: "Invalid organization ID",
      });
      return;
    }

    const organization = await Organization.findOne({
      _id: organizationId,
      status: "ACTIVE",
    });

    if (!organization) {
      res.status(404).json({
        success: false,
        message: "Organization not found",
      });
      return;
    }

    const membership = await OrganizationMember.findOne({
      user: userId,
      organization: organizationId,
      status: "ACTIVE",
    });

    if (!membership) {
      res.status(403).json({
        success: false,
        message: "You do not have access to this organization",
      });
      return;
    }

    req.organizationId = organizationId;
    req.organizationRole = membership.role;

    next();
  } catch (error) {
    console.error("Organization middleware error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to verify organization access",
    });
  }
};

// Restrict actions to organization owners and admins
export const requireOrganizationAdmin = (
  req: OrganizationRequest,
  res: Response,
  next: NextFunction
): void => {
  if (
    req.organizationRole !== "OWNER" 
  ) {
    res.status(403).json({
      success: false,
      message: "Organization administrator permission required",
    });
    return;
  }

  next();
};
