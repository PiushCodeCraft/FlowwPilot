
import { z } from "zod";

export const createWorkflowRequestSchema = z.object({
  workflowId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid workflow ID"),

  title: z.string().trim().min(2).max(150),

  formData: z.record(z.string(), z.unknown()),
});

export type CreateWorkflowRequestInput = z.infer<
  typeof createWorkflowRequestSchema
>;
