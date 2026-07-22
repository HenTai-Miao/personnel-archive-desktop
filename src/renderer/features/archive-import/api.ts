/** 批量导入 API：上传 multipart 工作簿，并仅用条目 ID 提交覆盖或跳过决定。 */
import { z } from "zod"
import { requestJson } from "@/shared/api/client"
import type { ImportItemId } from "@/shared/api/schemas"
import {
  decisionSchema,
  type ImportDecision,
  importBatchSchema,
  importHistoryPageSchema,
  importItemSchema,
} from "./schemas"

const importHistoryQuerySchema = z
  .object({
    page: z.number().int().nonnegative(),
    size: z.number().int().min(1).max(100),
  })
  .strict()

export async function uploadWorkbooks(files: readonly File[]) {
  const body = new FormData()
  for (const file of files) body.append("files", file, file.name)
  return requestJson("imports", importBatchSchema, { method: "post", body, timeout: 120_000 })
}

export async function submitDecision(itemId: ImportItemId, decision: ImportDecision) {
  const payload = decisionSchema.parse({ decision })
  return requestJson(`imports/${itemId}/decision`, importItemSchema, {
    method: "post",
    json: payload,
  })
}

export function buildImportHistoryPath(input: unknown): string {
  const query = importHistoryQuerySchema.parse(input)
  return `imports/history?${new URLSearchParams({ page: String(query.page), size: String(query.size) })}`
}

export function fetchImportHistory(input: unknown) {
  return requestJson(buildImportHistoryPath(input), importHistoryPageSchema)
}
