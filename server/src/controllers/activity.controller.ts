
import { Response } from "express";

import ActivityLog from "../models/ActivityLog";
import { OrganizationRequest } from "../middleware/organization.middleware";

// GET: Organization-wide activity history
export const getOrganizationActivity = async (
  req: OrganizationRequest,
  res: Response
): Promise<void> => {
  try {
    const organizationId = String(req.organizationId);

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter = {
      organization: organizationId,
    };

    const [activities, total] = await Promise.all([
      ActivityLog.find(filter)
        .populate("user", "name email")
        .populate("request", "title status")
        .populate("workflow", "name category")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),

      ActivityLog.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      count: activities.length,
      data: activities,
    });
  } catch (error) {
    console.error("Get organization activity error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch organization activity",
    });
  }
};

// GET: Activity performed by the logged-in user
export const getMyActivity = async (
  req: OrganizationRequest,
  res: Response
): Promise<void> => {
  try {
    const organizationId = String(req.organizationId);
    const userId = String(req.userId);

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter = {
      organization: organizationId,
      user: userId,
    };

    const [activities, total] = await Promise.all([
      ActivityLog.find(filter)
        .populate("user", "name email")
        .populate("request", "title status")
        .populate("workflow", "name category")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),

      ActivityLog.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      count: activities.length,
      data: activities,
    });
  } catch (error) {
    console.error("Get my activity error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch your activity",
    });
  }
};
