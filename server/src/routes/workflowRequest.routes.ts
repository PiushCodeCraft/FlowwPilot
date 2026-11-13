
import { Router } from "express";

import { protect } from "../middleware/auth.middleware";
import { requireOrganization } from "../middleware/organization.middleware";

import {
  createWorkflowRequest,
  getWorkflowRequests,
  getWorkflowRequestById,
  getPendingApprovals,
} from "../controllers/workflowRequest.controller";
const router = Router({ mergeParams: true });

router.use(protect);
router.use(requireOrganization);

router.post("/", createWorkflowRequest);
router.get("/", getWorkflowRequests);
router.get("/pending-approvals", requireOrganization, getPendingApprovals);
router.get("/:requestId", requireOrganization, getWorkflowRequestById);

export default router;
