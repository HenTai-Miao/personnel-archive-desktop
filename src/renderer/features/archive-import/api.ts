/** 批量导入 API：上传 multipart 工作簿，并仅用条目 ID 提交覆盖或跳过决定。 */
import { requestJson } from "@/shared/api/client"
import type { ImportItemId } from "@/shared/api/schemas"
import { decisionSchema, type ImportDecision, importBatchSchema, importItemSchema } from "./schemas"

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
