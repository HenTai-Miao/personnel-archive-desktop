/** 导入逐项状态及当前批次汇总的统一中文标签和 Element Plus 视觉语义。 */
import type { ImportStatus } from "./schemas"

type ImportStatusMeta = {
  readonly label: string
  readonly type: "info" | "success" | "warning" | "danger"
}

export type ImportPresentationItem = {
  readonly status: ImportStatus
  readonly code: string
}

const FIELD_VALIDATION_CODE = "IMPORT_FIELD_VALIDATION_FAILED"

export type ImportBatchSummary = ImportStatusMeta & {
  readonly kind: "EMPTY" | "PENDING" | "SUCCESS" | "PARTIAL_SUCCESS" | "NEEDS_CORRECTION" | "FAILED"
}

const STATUS_META: Readonly<Record<ImportStatus, ImportStatusMeta>> = {
  PENDING_DECISION: { label: "待确认", type: "warning" },
  IMPORTED: { label: "已导入", type: "success" },
  OVERWRITTEN: { label: "已覆盖", type: "success" },
  SKIPPED: { label: "已跳过", type: "info" },
  FAILED: { label: "失败", type: "danger" },
}

export function importStatusMeta(item: ImportPresentationItem): ImportStatusMeta {
  if (isFieldValidationFailure(item)) {
    return { label: "需修正", type: "warning" }
  }
  return STATUS_META[item.status]
}

export function importBatchSummary(items: readonly ImportPresentationItem[]): ImportBatchSummary {
  if (items.length === 0) return { kind: "EMPTY", label: "暂无结果", type: "info" }
  const statuses = items.map((item) => item.status)
  if (statuses.includes("PENDING_DECISION")) {
    return { kind: "PENDING", label: "待确认", type: "warning" }
  }
  const failedCount = statuses.filter((status) => status === "FAILED").length
  const correctionCount = items.filter(isFieldValidationFailure).length
  if (correctionCount === items.length) {
    return { kind: "NEEDS_CORRECTION", label: `${correctionCount} 份待修正`, type: "warning" }
  }
  if (failedCount === items.length) {
    return { kind: "FAILED", label: "全部失败", type: "danger" }
  }
  if (failedCount > 0) {
    return { kind: "PARTIAL_SUCCESS", label: "部分成功", type: "warning" }
  }
  return { kind: "SUCCESS", label: "处理完成", type: "success" }
}

function isFieldValidationFailure(item: ImportPresentationItem): boolean {
  return item.status === "FAILED" && item.code === FIELD_VALIDATION_CODE
}
