/** 导入批次、逐项状态、重复摘要和用户决定的运行时响应契约。 */
import { z } from "zod"
import { importItemIdSchema } from "@/shared/api/schemas"

export const importStatusSchema = z.enum([
  "PENDING_DECISION",
  "IMPORTED",
  "OVERWRITTEN",
  "SKIPPED",
  "FAILED",
])

export const duplicateInfoSchema = z
  .object({
    personName: z.string().min(1),
    identityCardLastFour: z.string().length(4),
    existingEmployeeNo: z.string(),
    incomingEmployeeNo: z.string(),
    existingUpdatedAt: z.iso.datetime({ offset: true }),
  })
  .strict()

export const importItemSchema = z
  .object({
    itemId: importItemIdSchema,
    fileName: z.string().min(1),
    status: importStatusSchema,
    code: z.string().min(1),
    message: z.string(),
    duplicate: duplicateInfoSchema.optional(),
  })
  .strict()

export const importBatchSchema = z
  .object({
    batchId: z.string().min(1),
    items: z.array(importItemSchema),
  })
  .strict()

export const decisionSchema = z.object({ decision: z.enum(["SKIP", "OVERWRITE"]) }).strict()

export type ImportItem = z.infer<typeof importItemSchema>
export type ImportStatus = z.infer<typeof importStatusSchema>
export type ImportDecision = z.infer<typeof decisionSchema>["decision"]
