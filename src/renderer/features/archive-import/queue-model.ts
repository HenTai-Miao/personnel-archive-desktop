/** 导入队列领域模型：把上传响应按顺序关联到本地来源，并描述源文件后续状态。 */

import type { ArchiveScannedWorkbookResult, SelectedWorkbook } from "@shared/ipc-contract"
import type { ImportItemId } from "@/shared/api/schemas"
import type { WorkbookSource } from "./archive-policy"
import type { ImportItem } from "./schemas"

const WORKBOOK_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

export type QueuedWorkbook = {
  readonly id: string
  readonly file: File
  readonly source: WorkbookSource
}

export type LocalFileState =
  | { readonly kind: "MANUAL_RETAINED" }
  | { readonly kind: "AUTO_WAITING" }
  | { readonly kind: "AUTO_RETAINED" }
  | { readonly kind: "AUTO_MOVED"; readonly archivedName: string }
  | { readonly kind: "AUTO_MOVE_FAILED"; readonly message: string }

export type ImportRow = ImportItem & {
  readonly source: WorkbookSource
  readonly localState: LocalFileState
}

const DEFAULT_REQUEST_BYTE_BUDGET = 48 * 1024 * 1024

export function splitUploadQueue(
  queuedWorkbooks: readonly QueuedWorkbook[],
  byteBudget = DEFAULT_REQUEST_BYTE_BUDGET,
): readonly (readonly QueuedWorkbook[])[] {
  if (byteBudget <= 0) throw new InvalidUploadByteBudgetError(byteBudget)
  /** 分片本身是构建过程，完成后只以 readonly 数组暴露。 */
  const chunks: QueuedWorkbook[][] = []
  let currentChunk: QueuedWorkbook[] = []
  let currentBytes = 0
  for (const queued of queuedWorkbooks) {
    if (currentChunk.length > 0 && currentBytes + queued.file.size > byteBudget) {
      chunks.push(currentChunk)
      currentChunk = []
      currentBytes = 0
    }
    currentChunk.push(queued)
    currentBytes += queued.file.size
  }
  if (currentChunk.length > 0) chunks.push(currentChunk)
  return chunks
}

export function createWorkbookFile(workbook: Pick<SelectedWorkbook, "bytes" | "name">): File {
  return new File([workbook.bytes], workbook.name, { type: WORKBOOK_MIME })
}

export function manualSelectionMessage(selectedCount: number, acceptedCount: number): string {
  if (selectedCount === 0) return "未选择文件"
  if (selectedCount === acceptedCount) return `已加入 ${acceptedCount} 个手动工作簿`
  return `队列最多 100 份，已加入其中 ${acceptedCount} 份`
}

export function pairImportRows(
  queuedWorkbooks: readonly QueuedWorkbook[],
  importedItems: readonly ImportItem[],
): readonly ImportRow[] {
  if (queuedWorkbooks.length !== importedItems.length) {
    throw new ImportResultMismatchError(queuedWorkbooks.length, importedItems.length)
  }
  return importedItems.map((item, index) => {
    const queued = queuedWorkbooks[index]
    if (queued === undefined) {
      throw new ImportResultMismatchError(queuedWorkbooks.length, importedItems.length)
    }
    return {
      ...item,
      source: queued.source,
      localState: initialLocalState(queued.source, item.status),
    }
  })
}

export function replaceImportRow(
  rows: readonly ImportRow[],
  itemId: ImportItemId,
  replacement: ImportRow,
): readonly ImportRow[] {
  return rows.map((row) => (row.itemId === itemId ? replacement : row))
}

export function findImportRow(
  rows: readonly ImportRow[],
  itemId: ImportItemId,
): ImportRow | undefined {
  return rows.find((row) => row.itemId === itemId)
}

export function initialLocalState(
  source: WorkbookSource,
  status: ImportItem["status"],
): LocalFileState {
  switch (source.kind) {
    case "MANUAL":
      return { kind: "MANUAL_RETAINED" }
    case "AUTO":
      return automaticLocalState(status)
    default:
      return assertNever(source)
  }
}

export function mergeImportItem(item: ImportItem, source: WorkbookSource): ImportRow {
  return { ...item, source, localState: initialLocalState(source, item.status) }
}

export function archiveLocalState(result: ArchiveScannedWorkbookResult): LocalFileState {
  switch (result.status) {
    case "MOVED":
      return { kind: "AUTO_MOVED", archivedName: result.archivedName }
    case "FAILED":
      return { kind: "AUTO_MOVE_FAILED", message: result.message }
    default:
      return assertNever(result)
  }
}

function automaticLocalState(status: ImportItem["status"]): LocalFileState {
  switch (status) {
    case "PENDING_DECISION":
    case "IMPORTED":
    case "OVERWRITTEN":
      return { kind: "AUTO_WAITING" }
    case "SKIPPED":
    case "FAILED":
      return { kind: "AUTO_RETAINED" }
    default:
      return assertNever(status)
  }
}

export class ImportResultMismatchError extends Error {
  readonly name = "ImportResultMismatchError"

  constructor(
    readonly uploadedCount: number,
    readonly resultCount: number,
  ) {
    super(`上传 ${uploadedCount} 个文件，但服务端返回 ${resultCount} 条结果`)
  }
}

class InvalidUploadByteBudgetError extends Error {
  readonly name = "InvalidUploadByteBudgetError"

  constructor(readonly byteBudget: number) {
    super(`上传请求字节预算必须大于 0，当前为 ${byteBudget}`)
  }
}

function assertNever(value: never): never {
  throw new TypeError(`未知工作簿来源：${String(value)}`)
}
