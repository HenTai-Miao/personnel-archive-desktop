/** 重复决定错误策略：只按稳定服务端错误码识别需要重新预检的过期决定。 */
import { ApiError } from "@/shared/api/error"

export function isStaleImportDecision(error: unknown): boolean {
  return error instanceof ApiError && error.code === "STALE_IMPORT_DECISION"
}
