
import { z } from "zod";

const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid MongoDB ID");

const formFieldSchema = z.object({
  name: z.string().trim().min(1).max(100),
  label: z.string().trim().min(1).max(150),
  type: z.enum(["TEXT", "NUMBER", "DATE", "SELECT", "TEXTAREA"]),
  required: z.boolean().default(false),
  options: z.array(z.string().trim().min(1)).optional(),
}).superRefine((field, ctx) => {
  if (field.type === "SELECT" && (!field.options || field.options.length === 0)) {
    ctx.addIssue({
      code: "custom",
      message: "SELECT fields must have at least one option",
      path: ["options"],
    });
  }
});

const stageSchema = z.object({
  order: z.number().int().min(1),
  name: z.string().trim().min(1).max(100),
  approver: objectIdSchema,
});

const workflowFields = {
  name: z.string().trim().min(2).max(150),
  description: z.string().trim().max(1000).default(""),
  category: z.string().trim().min(2).max(100),
  formFields: z.array(formFieldSchema).default([]),
  stages: z.array(stageSchema).min(1, "At least one approval stage is required"),
};

function validateStages(
  stages: Array<{ order: number; name: string; approver: string }>,
  ctx: z.RefinementCtx
) {
  const orders = stages.map((stage) => stage.order);

  if (new Set(orders).size !== orders.length) {
    ctx.addIssue({
      code: "custom",
      message: "Approval stage order values must be unique",
      path: ["stages"],
    });
  }
}

export const createWorkflowSchema = z
  .object(workflowFields)
  .superRefine((data, ctx) => validateStages(data.stages, ctx));


export const updateWorkflowSchema = z
  .object({
    name: z.string().trim().min(2).max(150).optional(),
    description: z.string().trim().max(1000).optional(),
    category: z.string().trim().min(2).max(100).optional(),
    formFields: z.array(formFieldSchema).optional(),
    stages: z.array(stageSchema).min(1).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one field to update",
  })
  .superRefine((data, ctx) => {
    if (data.stages) validateStages(data.stages, ctx);
  });


export const workflowStatusSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

export type CreateWorkflowInput = z.infer<typeof createWorkflowSchema>;
export type UpdateWorkflowInput = z.infer<typeof updateWorkflowSchema>;
