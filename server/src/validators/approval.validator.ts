
import { z } from "zod";

export const approvalDecisionSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  comments: z.string().trim().max(1000).optional(),
});

export type ApprovalDecisionInput = z.infer<
  typeof approvalDecisionSchema
>;
