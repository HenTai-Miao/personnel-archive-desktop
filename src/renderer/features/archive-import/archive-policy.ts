/** 本地来源策略：手动文件始终留在原位，自动文件仅在服务端最终成功后归档。 */
import type { ScannedWorkbookToken } from "@shared/ipc-contract"
import type { ImportStatus } from "./schemas"

export type WorkbookSource =
  | { readonly kind: "MANUAL" }
  | { readonly kind: "AUTO"; readonly token: ScannedWorkbookToken }

export function shouldArchiveWorkbook(source: WorkbookSource, status: ImportStatus): boolean {
  switch (source.kind) {
    case "MANUAL":
      return false
    case "AUTO":
      return isCompletedImport(status)
    default:
      return assertNever(source)
  }
}

function isCompletedImport(status: ImportStatus): boolean {
  switch (status) {
    case "IMPORTED":
    case "OVERWRITTEN":
      return true
    case "PENDING_DECISION":
    case "SKIPPED":
    case "FAILED":
      return false
    default:
      return assertNever(status)
  }
}

function assertNever(value: never): never {
  throw new TypeError(`未知导入状态：${String(value)}`)
}
