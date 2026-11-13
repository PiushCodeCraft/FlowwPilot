
import { Response } from "express";
import { Types } from "mongoose";

import Workflow from "../models/Workflow";
import WorkflowRequest from "../models/WorkflowRequest";
import ActivityLog from "../models/ActivityLog";
import { OrganizationRequest } from "../middleware/organization.middleware";
import { createWorkflowRequestSchema } from "../validators/workflowRequest.validator";

const validateFormData = (
  fields: Array<{
    name: string;
    label: string;
    type: string;
    required: boolean;
    options?: string[];
  }>,
  formData: Record<string, unknown>
): string | null => {
  const allowedFields = new Set(fields.map((field) => field.name));

  for (const key of Object.keys(formData)) {
    if (!allowedFields.has(key)) {
      return `Unknown form field: ${key}`;
    }
  }

  for (const field of fields) {
    const value = formData[field.name];

    if (
      field.required &&
      (value === undefined ||
        value === null ||
        (typeof value === "string" && !value.trim()))
    ) {
      return `${field.label} is required`;
    }

    if (value === undefined || value === null || value === "") {
      continue;
    }

    switch (field.type) {
      case "TEXT":
      case "TEXTAREA":
        if (typeof value !== "string") {
          return `${field.label} must be text`;
        }
        break;

      case "NUMBER":
        if (typeof value !== "number" || !Number.isFinite(value)) {
          return `${field.label} must be a valid number`;
        }
        break;

      case "DATE":
        if (
          typeof value !== "string" ||
          Number.isNaN(Date.parse(value))
        ) {
          return `${field.label} must be a valid date`;
        }
        break;

      case "SELECT":
        if (
          typeof value !== "string" ||
          !field.options?.includes(value)
        ) {
          return `${field.label} has an invalid selection`;
        }
        break;
    }
  }

  return null;
};

// POST: Submit a workflow request
export const createWorkflowRequest = async (
  req: OrganizationRequest,
  res: Response
): Promise<void> => {
  try {
    const parsed = createWorkflowRequestSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Invalid request data",
        errors: parsed.error.issues,
      });
      return;
    }

    const organizationId = String(req.organizationId);
    const userId = String(req.userId);

    const workflow = await Workflow.findOne({
      _id: parsed.data.workflowId,
      organization: organizationId,
      status: "ACTIVE",
    });

    if (!workflow) {
      res.status(404).json({
        success: false,
        message: "Active workflow not found in this organization",
      });
      return;
    }

    if (!workflow.stages.length) {
      res.status(400).json({
        success: false,
        message: "This workflow has no approval stages configured",
      });
      return;
    }

    const formError = validateFormData(
      workflow.formFields,
      parsed.data.formData
    );

    if (formError) {
      res.status(400).json({
        success: false,
        message: formError,
      });
      return;
    }

    // Snapshot workflow stages so future edits do not affect submitted requests.
    const stages = [...workflow.stages]
      .sort((a, b) => a.order - b.order)
      .map((stage) => ({
        order: stage.order,
        name: stage.name,
        approver: stage.approver,
        status: "PENDING" as const,
      }));

    const workflowRequest = await WorkflowRequest.create({
      organization: organizationId,
      workflow: workflow._id,
      submittedBy: userId,
      title: parsed.data.title,
      formData: new Map(Object.entries(parsed.data.formData)),
      stages,
      currentStageOrder: stages[0].order,
      status: "IN_PROGRESS",
      submittedAt: new Date(),
    });

    await ActivityLog.create({
      organization: organizationId,
      user: userId,
      action: "REQUEST_SUBMITTED",
      description: `Submitted request: ${parsed.data.title}`,
      request: workflowRequest._id,
      workflow: workflow._id,
      metadata: {
        workflowName: workflow.name,
        currentStage: stages[0].name,
      },
    });

    res.status(201).json({
      success: true,
      message: "Workflow request submitted successfully",
      data: workflowRequest,
    });
  } catch (error) {
    console.error("Create workflow request error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to submit workflow request",
    });
  }
};

// GET: List requests visible to the logged-in user
export const getWorkflowRequests = async (
  req: OrganizationRequest,
  res: Response
): Promise<void> => {
  try {
    const organizationId = String(req.organizationId);
    const userId = String(req.userId);

    const filter: Record<string, unknown> = {
      organization: organizationId,
    };

    // Owners and admins can see all requests.
    // Members can see requests they submitted or were assigned to approve.
    if (
      req.organizationRole !== "OWNER" &&
      req.organizationRole !== "ADMIN"
    ) {
      filter.$or = [
        { submittedBy: userId },
        { "stages.approver": userId },
      ];
    }

    const requests = await WorkflowRequest.find(filter)
      .populate("workflow", "name category")
      .populate("submittedBy", "name email")
      .populate("stages.approver", "name email")
      .sort({ submittedAt: -1 });

    res.status(200).json({
      success: true,
      count: requests.length,
      data: requests,
    });
  } catch (error) {
    console.error("Get workflow requests error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch workflow requests",
    });
  }
};

// GET: List requests currently waiting for this user's approval
export const getPendingApprovals = async (
  req: OrganizationRequest,
  res: Response
): Promise<void> => {
  try {
    const organizationId = String(req.organizationId);
    const userId = String(req.userId);

    const requests = await WorkflowRequest.find({
      organization: organizationId,
      status: "IN_PROGRESS",
      currentStageOrder: { $exists: true },
      stages: {
        $elemMatch: {
          approver: userId,
          status: "PENDING",
        },
      },
    })
      .populate("workflow", "name category")
      .populate("submittedBy", "name email")
      .populate("stages.approver", "name email")
      .sort({ submittedAt: -1 });

// Only return requests where this user is assigned to the current stage.
// Only return requests where this user is assigned to the current stage.
const assignedRequests = requests.filter((request) => {
  const stages = request.stages as Array<{
    order: number;
    name: string;
    approver: Types.ObjectId | { _id: Types.ObjectId };
    status: "PENDING" | "APPROVED" | "REJECTED" | "SKIPPED";
    actedAt?: Date;
  }>;

  const currentStage = stages.find(
    (stage) => stage.order === request.currentStageOrder
  );

  if (!currentStage) {
    return false;
  }

  const approverId =
    typeof currentStage.approver === "object" &&
    "_id" in currentStage.approver
      ? String(currentStage.approver._id)
      : String(currentStage.approver);

  return (
    approverId === userId &&
    currentStage.status === "PENDING"
  );
});

    res.status(200).json({
      success: true,
      count: assignedRequests.length,
      data: assignedRequests,
    });
  } catch (error) {
    console.error("Get pending approvals error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch pending approvals",
    });
  }
};

// GET: Get one request by ID
export const getWorkflowRequestById = async (
  req: OrganizationRequest,
  res: Response
): Promise<void> => {
  try {
    const requestId = Array.isArray(req.params.requestId)
      ? req.params.requestId[0]
      : req.params.requestId;

    if (
      typeof requestId !== "string" ||
      !Types.ObjectId.isValid(requestId)
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid request ID",
      });
      return;
    }

    const filter: Record<string, unknown> = {
      _id: requestId,
      organization: req.organizationId,
    };

    if (
      req.organizationRole !== "OWNER" &&
      req.organizationRole !== "ADMIN"
    ) {
      filter.$or = [
        { submittedBy: req.userId },
        { "stages.approver": req.userId },
      ];
    }

    const workflowRequest = await WorkflowRequest.findOne(filter)
      .populate("workflow", "name category")
      .populate("submittedBy", "name email")
      .populate("stages.approver", "name email");

    if (!workflowRequest) {
      res.status(404).json({
        success: false,
        message: "Workflow request not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: workflowRequest,
    });
  } catch (error) {
    console.error("Get workflow request error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch workflow request",
    });
  }
};
