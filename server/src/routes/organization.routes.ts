
import { Router } from "express";

import {
  createOrganization,
  getMyOrganizations,
  getOrganizationDetails,
  getOrganizationMembers,
  addOrganizationMember,
} from "../controllers/organization.controller";

import { protect } from "../middleware/auth.middleware";

import {
  requireOrganization,
  requireOrganizationAdmin,
} from "../middleware/organization.middleware";

const router = Router();

// All organization routes require authentication
router.use(protect);

// List and create organizations
router.get("/", getMyOrganizations);
router.post("/", createOrganization);

// Organization-specific routes
router.get(
  "/:organizationId",
  requireOrganization,
  getOrganizationDetails
);

router.get(
  "/:organizationId/members",
  requireOrganization,
  getOrganizationMembers
);

router.post(
  "/:organizationId/members",
  requireOrganization,
  requireOrganizationAdmin,
  addOrganizationMember
);

export default router;
