
import { Request, Response } from "express";
import { Types } from "mongoose";
import Workflow from "../models/Workflow";
import OrganizationMember from "../models/OrganizationMember";
import { OrganizationRequest } from "../middleware/organization.middleware";
import {
  createWorkflowSchema,
  updateWorkflowSchema,
  workflowStatusSchema,
} from "../validators/workflow.validator";

const getId = (value: string | string[] | undefined): string | null => {
  const id = Array.isArray(value) ? value[0] : value;
  return typeof id === "string" && Types.ObjectId.isValid(id) ? id : null;
};

const canManageWorkflows = (role?: string): boolean =>
  role === "OWNER" || role === "ADMIN";

const validateApprovers = async (
  organizationId: string,
  stages: Array<{ approver: string }>
): Promise<boolean> => {
  const approverIds = [...new Set(stages.map((stage) => stage.approver))];

  const activeMembers = await OrganizationMember.distinct("user", {
    organization: organizationId,
    user: { $in: approverIds },
    status: "ACTIVE",
  });

  return activeMembers.length === approverIds.length;
};

// POST: Create workflow
export const createWorkflow = async (
  req: OrganizationRequest,
  res: Response
): Promise<void> => {
  try {
    if (!canManageWorkflows(req.organizationRole)) {
      res.status(403).json({
        success: false,
        message: "Only organization owners and admins can create workflows",
      });
      return;
    }

    const parsed = createWorkflowSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Invalid workflow data",
        errors: parsed.error.issues,
      });
      return;
    }

    const organizationId = String(req.organizationId);
    const validApprovers = await validateApprovers(
      organizationId,
      parsed.data.stages
    );

    if (!validApprovers) {
      res.status(400).json({
        success: false,
        message: "Every approver must be an active member of this organization",
      });
      return;
    }

    const workflow = await Workflow.create({
      ...parsed.data,
      stages: [...parsed.data.stages].sort((a, b) => a.order - b.order),
      organization: organizationId,
      createdBy: req.userId,
    });

    res.status(201).json({
      success: true,
      message: "Workflow created successfully",
      data: workflow,
    });
  } catch (error: unknown) {
    const mongoError = error as { code?: number };

    if (mongoError.code === 11000) {
      res.status(409).json({
        success: false,
        message: "A workflow with this name already exists in this organization",
      });
      return;
    }

    console.error("Create workflow error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create workflow",
    });
  }
};

// GET: List workflows
export const getWorkflows = async (
  req: OrganizationRequest,
  res: Response
): Promise<void> => {
  try {
    const workflows = await Workflow.find({
      organization: req.organizationId,
    })
      .populate("createdBy", "name email")
      .populate("stages.approver", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: workflows.length,
      data: workflows,
    });
  } catch (error) {
    console.error("Get workflows error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch workflows",
    });
  }
};

// GET: Get one workflow
export const getWorkflowById = async (
  req: OrganizationRequest,
  res: Response
): Promise<void> => {
  try {
    const workflowId = getId(req.params.workflowId);

    if (!workflowId) {
      res.status(400).json({
        success: false,
        message: "Invalid workflow ID",
      });
      return;
    }

    const workflow = await Workflow.findOne({
      _id: workflowId,
      organization: req.organizationId,
    })
      .populate("createdBy", "name email")
      .populate("stages.approver", "name email");

    if (!workflow) {
      res.status(404).json({
        success: false,
        message: "Workflow not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: workflow,
    });
  } catch (error) {
    console.error("Get workflow error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch workflow",
    });
  }
};

// PUT: Update workflow
export const updateWorkflow = async (
  req: OrganizationRequest,
  res: Response
): Promise<void> => {
  try {
    if (!canManageWorkflows(req.organizationRole)) {
      res.status(403).json({
        success: false,
        message: "Only organization owners and admins can update workflows",
      });
      return;
    }

    const workflowId = getId(req.params.workflowId);

    if (!workflowId) {
      res.status(400).json({
        success: false,
        message: "Invalid workflow ID",
      });
      return;
    }

    const parsed = updateWorkflowSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Invalid workflow update data",
        errors: parsed.error.issues,
      });
      return;
    }

    const organizationId = String(req.organizationId);

    if (parsed.data.stages) {
      const validApprovers = await validateApprovers(
        organizationId,
        parsed.data.stages
      );

      if (!validApprovers) {
        res.status(400).json({
          success: false,
          message: "Every approver must be an active member of this organization",
        });
        return;
      }
    }

    const updateData = { ...parsed.data };

    if (updateData.stages) {
      updateData.stages = [...updateData.stages].sort(
        (a, b) => a.order - b.order
      );
    }

    const workflow = await Workflow.findOneAndUpdate(
      { _id: workflowId, organization: organizationId },
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate("createdBy", "name email")
      .populate("stages.approver", "name email");

    if (!workflow) {
      res.status(404).json({
        success: false,
        message: "Workflow not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Workflow updated successfully",
      data: workflow,
    });
  } catch (error: unknown) {
    const mongoError = error as { code?: number };

    if (mongoError.code === 11000) {
      res.status(409).json({
        success: false,
        message: "A workflow with this name already exists in this organization",
      });
      return;
    }

    console.error("Update workflow error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update workflow",
    });
  }
};

// PATCH: Activate or deactivate workflow
export const updateWorkflowStatus = async (
  req: OrganizationRequest,
  res: Response
): Promise<void> => {
  try {
    if (!canManageWorkflows(req.organizationRole)) {
      res.status(403).json({
        success: false,
        message: "Only organization owners and admins can change workflow status",
      });
      return;
    }

    const workflowId = getId(req.params.workflowId);

    if (!workflowId) {
      res.status(400).json({
        success: false,
        message: "Invalid workflow ID",
      });
      return;
    }

    const parsed = workflowStatusSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Status must be ACTIVE or INACTIVE",
      });
      return;
    }

    const workflow = await Workflow.findOneAndUpdate(
      { _id: workflowId, organization: req.organizationId },
      { $set: { status: parsed.data.status } },
      { new: true, runValidators: true }
    );

    if (!workflow) {
      res.status(404).json({
        success: false,
        message: "Workflow not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: `Workflow ${parsed.data.status.toLowerCase()} successfully`,
      data: workflow,
    });
  } catch (error) {
    console.error("Update workflow status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update workflow status",
    });
  }
};
