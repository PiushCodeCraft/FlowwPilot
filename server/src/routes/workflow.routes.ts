
import { Router } from "express";
import { protect } from "../middleware/auth.middleware";
import {
  requireOrganization,
} from "../middleware/organization.middleware";
import {
  createWorkflow,
  getWorkflows,
  getWorkflowById,
  updateWorkflow,
  updateWorkflowStatus,
} from "../controllers/workflow.controller";

const router = Router({ mergeParams: true });

router.use(protect);
router.use(requireOrganization);

router.post("/", createWorkflow);
router.get("/", getWorkflows);
router.get("/:workflowId", getWorkflowById);
router.put("/:workflowId", updateWorkflow);
router.patch("/:workflowId/status", updateWorkflowStatus);

export default router;
