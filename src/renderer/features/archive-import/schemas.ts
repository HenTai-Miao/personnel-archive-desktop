/** 导入批次、逐项状态、重复摘要和用户决定的运行时响应契约。 */
import { z } from "zod"
import { importBatchIdSchema, importItemIdSchema } from "@/shared/api/schemas"

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
    batchId: importBatchIdSchema,
    items: z.array(importItemSchema),
  })
  .strict()

export const importHistoryItemSchema = z
  .object({
    itemId: importItemIdSchema,
    batchId: importBatchIdSchema,
    operatorName: z.string(),
    fileName: z.string().min(1),
    status: importStatusSchema,
    code: z.string().min(1),
    message: z.string(),
    processedAt: z.iso.datetime({ offset: true }),
  })
  .strict()

export const importHistoryPageSchema = z
  .object({
    content: z.array(importHistoryItemSchema),
    page: z.number().int().nonnegative(),
    size: z.number().int().positive(),
    totalElements: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
  })
  .strict()

export const decisionSchema = z.object({ decision: z.enum(["SKIP", "OVERWRITE"]) }).strict()

export type ImportItem = z.infer<typeof importItemSchema>
export type ImportHistoryItem = Readonly<z.infer<typeof importHistoryItemSchema>>
export type ImportStatus = z.infer<typeof importStatusSchema>
export type ImportDecision = z.infer<typeof decisionSchema>["decision"]
