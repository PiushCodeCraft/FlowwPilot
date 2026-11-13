import { Request, Response } from "express";
import mongoose, { Types } from "mongoose";

import WorkflowRequest from "../models/WorkflowRequest";
import Approval from "../models/Approval";
import ActivityLog from "../models/ActivityLog";

import { OrganizationRequest } from "../middleware/organization.middleware";
import { approvalDecisionSchema } from "../validators/approval.validator";

class ApprovalError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message);
    this.name = "ApprovalError";
  }
}

export const processApproval = async (
  req: OrganizationRequest,
  res: Response
): Promise<void> => {
  const requestId = Array.isArray(req.params.requestId)
    ? req.params.requestId[0]
    : req.params.requestId;

  if (typeof requestId !== "string" || !Types.ObjectId.isValid(requestId)) {
    res.status(400).json({
      success: false,
      message: "Invalid request ID",
    });
    return;
  }

  const parsed = approvalDecisionSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: "Invalid approval decision",
      errors: parsed.error.issues,
    });
    return;
  }

  const userId = String(req.userId);
  const organizationId = String(req.organizationId);
  const { decision, comments } = parsed.data;

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const workflowRequest = await WorkflowRequest.findOne({
        _id: requestId,
        organization: organizationId,
      }).session(session);

      if (!workflowRequest) {
        throw new ApprovalError("Workflow request not found", 404);
      }

      if (workflowRequest.status !== "IN_PROGRESS") {
        throw new ApprovalError("This request has already been completed", 400);
      }

      const stages = workflowRequest.stages as Array<{
        order: number;
        name: string;
        approver: Types.ObjectId;
        status: "PENDING" | "APPROVED" | "REJECTED" | "SKIPPED";
        actedAt?: Date;
      }>;

      const currentStage = stages.find(
        (stage) => stage.order === workflowRequest.currentStageOrder
      );

      if (!currentStage) {
        throw new ApprovalError(
          "Current approval stage could not be found",
          400
        );
      }

      if (String(currentStage.approver) !== userId) {
        throw new ApprovalError(
          "You are not authorized to decide this approval stage",
          403
        );
      }

      if (currentStage.status !== "PENDING") {
        throw new ApprovalError(
          "This approval stage has already been processed",
          409
        );
      }

      const now = new Date();

      // Save the individual approval decision.
      await Approval.create(
        [
          {
            organization: organizationId,
            request: workflowRequest._id,
            approver: userId,
            stageOrder: currentStage.order,
            stageName: currentStage.name,
            decision,
            comments,
            decidedAt: now,
          },
        ],
        { session }
      );

      currentStage.status = decision;
      currentStage.actedAt = now;

      if (decision === "REJECTED") {
        // A rejection terminates the complete workflow.
        for (const stage of stages) {
          if (stage.order > currentStage.order && stage.status === "PENDING") {
            stage.status = "SKIPPED";
          }
        }

        workflowRequest.status = "REJECTED";
        workflowRequest.completedAt = now;
      } else {
        // Find the next approval stage.
        const nextStage = stages
          .filter((stage) => stage.order > currentStage.order)
          .sort((a, b) => a.order - b.order)[0];

        if (nextStage) {
          workflowRequest.currentStageOrder = nextStage.order;
          workflowRequest.status = "IN_PROGRESS";
        } else {
          // No more stages: workflow is complete.
          workflowRequest.status = "APPROVED";
          workflowRequest.completedAt = now;
        }
      }

      await workflowRequest.save({ session });

      const action =
        decision === "APPROVED" ? "REQUEST_APPROVED" : "REQUEST_REJECTED";

      await ActivityLog.create(
        [
          {
            organization: organizationId,
            user: userId,
            action,
            description: `${
              decision === "APPROVED" ? "Approved" : "Rejected"
            } request: ${workflowRequest.title} at ${currentStage.name}`,
            request: workflowRequest._id,
            workflow: workflowRequest.workflow,
            metadata: {
              stageOrder: currentStage.order,
              stageName: currentStage.name,
              decision,
              comments: comments || "",
            },
          },
        ],
        { session }
      );
    });

    const updatedRequest = await WorkflowRequest.findOne({
      _id: requestId,
      organization: organizationId,
    })
      .populate("workflow", "name category")
      .populate("submittedBy", "name email")
      .populate("stages.approver", "name email");

    res.status(200).json({
      success: true,
      message:
        decision === "APPROVED"
          ? "Approval decision recorded successfully"
          : "Request rejected successfully",
      data: updatedRequest,
    });
  } catch (error) {
    if (error instanceof ApprovalError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
      return;
    }

    const mongoError = error as { code?: number };

    if (mongoError.code === 11000) {
      res.status(409).json({
        success: false,
        message: "A decision has already been recorded for this stage",
      });
      return;
    }

    console.error("Process approval error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to process approval",
    });
  } finally {
    await session.endSession();
  }
};

// GET: View approval history for a request
export const getApprovalHistory = async (
  req: OrganizationRequest,
  res: Response
): Promise<void> => {
  try {
    const requestId = Array.isArray(req.params.requestId)
      ? req.params.requestId[0]
      : req.params.requestId;

    if (typeof requestId !== "string" || !Types.ObjectId.isValid(requestId)) {
      res.status(400).json({
        success: false,
        message: "Invalid request ID",
      });
      return;
    }

    const workflowRequest = await WorkflowRequest.findOne({
      _id: requestId,
      organization: req.organizationId,
    });

    if (!workflowRequest) {
      res.status(404).json({
        success: false,
        message: "Workflow request not found",
      });
      return;
    }

// Members can view history for requests they submitted
// or requests assigned to them for approval.
if (
  req.organizationRole !== "OWNER" &&
  req.organizationRole !== "ADMIN"
) {
  const isSubmitter =
    String(workflowRequest.submittedBy) === String(req.userId);

const stages = workflowRequest.stages as Array<{
  order: number;
  name: string;
  approver: Types.ObjectId;
  status: "PENDING" | "APPROVED" | "REJECTED" | "SKIPPED";
  actedAt?: Date;
}>;

const isAssignedApprover = stages.some(
  (stage) => String(stage.approver) === String(req.userId)
);

  if (!isSubmitter && !isAssignedApprover) {
    res.status(403).json({
      success: false,
      message: "You cannot view this request's approval history",
    });
    return;
  }
}

    const approvals = await Approval.find({
      request: requestId,
      organization: req.organizationId,
    })
      .populate("approver", "name email")
      .sort({ stageOrder: 1 });

    res.status(200).json({
      success: true,
      count: approvals.length,
      data: approvals,
    });
  } catch (error) {
    console.error("Get approval history error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch approval history",
    });
  }
};
