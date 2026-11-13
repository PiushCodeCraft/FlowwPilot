
import { Router } from "express";

import {
  getOrganizationActivity,
  getMyActivity,
} from "../controllers/activity.controller";

import { protect } from "../middleware/auth.middleware";
import { requireOrganization } from "../middleware/organization.middleware";

const router = Router({ mergeParams: true });

router.use(protect);
router.use(requireOrganization);

router.get("/mine", getMyActivity);
router.get("/", getOrganizationActivity);

export default router;
