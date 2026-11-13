
import { Router } from "express";

import { protect } from "../middleware/auth.middleware";
import { requireOrganization } from "../middleware/organization.middleware";

import {
  processApproval,
  getApprovalHistory,
} from "../controllers/approval.controller";

const router = Router({ mergeParams: true });

router.use(protect);
router.use(requireOrganization);

router.post("/:requestId/decision", processApproval);
router.get("/:requestId/history", getApprovalHistory);

export default router;
