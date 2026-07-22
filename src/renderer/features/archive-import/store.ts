/** 导入状态机：合并手动/自动队列，并仅在自动文件最终导入成功后请求主进程归档。 */

import type { FolderScanResult } from "@shared/ipc-contract"
import { defineStore } from "pinia"
import { computed, ref } from "vue"
import { errorMessage } from "@/shared/api/error"
import type { ImportItemId } from "@/shared/api/schemas"
import { submitDecision, uploadWorkbooks } from "./api"
import { shouldArchiveWorkbook, type WorkbookSource } from "./archive-policy"
import { isStaleImportDecision } from "./decision-policy"
import {
  archiveLocalState,
  createWorkbookFile,
  findImportRow,
  type ImportRow,
  manualSelectionMessage,
  mergeImportItem,
  pairImportRows,
  type QueuedWorkbook,
  replaceImportRow,
  splitUploadQueue,
} from "./queue-model"
import type { ImportDecision } from "./schemas"

const MAX_QUEUE_SIZE = 100
const AUTO_SCAN_INTERVAL_MS = 5_000

export const useImportStore = defineStore("archive-import", () => {
  const queuedWorkbooks = ref<readonly QueuedWorkbook[]>([])
  const items = ref<readonly ImportRow[]>([])
  const loading = ref(false)
  const scanning = ref(false)
  const message = ref("")
  const scanMessage = ref("")
  const scanState = ref<FolderScanResult["state"]>("UNCONFIGURED")
  const staleItemId = ref<ImportItemId | null>(null)
  /** 页面激活期间唯一的扫描定时器；停止扫描时必须清除。 */
  let scanTimer: number | null = null

  const pendingCount = computed(
    () => items.value.filter((item) => item.status === "PENDING_DECISION").length,
  )

  async function chooseFiles(): Promise<void> {
    if (loading.value || scanning.value) {
      message.value = "当前队列正在处理，请稍后再选择文件"
      return
    }
    const selected = await window.personnelArchive.selectWorkbooks()
    const remaining = MAX_QUEUE_SIZE - queuedWorkbooks.value.length
    const accepted = selected.slice(0, remaining).map((workbook) => ({
      id: crypto.randomUUID(),
      file: createWorkbookFile(workbook),
      source: { kind: "MANUAL" } satisfies WorkbookSource,
    }))
    queuedWorkbooks.value = [...queuedWorkbooks.value, ...accepted]
    items.value = []
    message.value = manualSelectionMessage(selected.length, accepted.length)
  }

  async function scanNow(): Promise<void> {
    const remaining = MAX_QUEUE_SIZE - queuedWorkbooks.value.length
    if (scanning.value || loading.value || remaining === 0) return
    scanning.value = true
    try {
      const result = await window.personnelArchive.scanPendingWorkbooks(remaining)
      scanState.value = result.state
      scanMessage.value = result.message
      const discovered = result.workbooks.map((workbook) => ({
        id: workbook.token,
        file: createWorkbookFile(workbook),
        source: { kind: "AUTO", token: workbook.token } satisfies WorkbookSource,
      }))
      queuedWorkbooks.value = [...queuedWorkbooks.value, ...discovered]
    } catch (error) {
      if (!(error instanceof Error)) throw error
      scanState.value = "FAILED"
      scanMessage.value = errorMessage(error)
    } finally {
      scanning.value = false
    }
  }

  function startAutoScan(): void {
    if (scanTimer !== null) return
    void scanNow()
    scanTimer = window.setInterval(() => void scanNow(), AUTO_SCAN_INTERVAL_MS)
  }

  function stopAutoScan(): void {
    if (scanTimer === null) return
    window.clearInterval(scanTimer)
    scanTimer = null
  }

  async function precheck(): Promise<void> {
    if (scanning.value) {
      message.value = "正在扫描待上传文件夹，请稍后再上传"
      return
    }
    const queued = queuedWorkbooks.value
    if (queued.length === 0) {
      message.value = "请先选择或等待扫描 .xlsx 工作簿"
      return
    }
    loading.value = true
    message.value = "正在上传并检查重复档案…"
    items.value = []
    let processedCount = 0
    try {
      for (const chunk of splitUploadQueue(queued)) {
        const result = await uploadWorkbooks(chunk.map((entry) => entry.file))
        const paired = pairImportRows(chunk, result.items)
        items.value = [...items.value, ...paired]
        processedCount += chunk.length
        queuedWorkbooks.value = queued.slice(processedCount)
        await archiveCompletedRows(paired)
      }
      message.value = items.value.some((item) => item.status === "FAILED")
        ? "批次已处理，部分文件需要检查"
        : "批次处理完成"
    } catch (error) {
      if (!(error instanceof Error)) throw error
      message.value =
        processedCount === 0
          ? errorMessage(error)
          : `已完成 ${processedCount} 份，剩余文件仍在队列：${errorMessage(error)}`
    } finally {
      loading.value = false
    }
  }

  async function decide(itemId: ImportItemId, decision: ImportDecision): Promise<void> {
    loading.value = true
    staleItemId.value = null
    try {
      const original = findImportRow(items.value, itemId)
      if (original === undefined) return
      const updated = await submitDecision(itemId, decision)
      const updatedRow = mergeImportItem(updated, original.source)
      items.value = replaceImportRow(items.value, itemId, updatedRow)
      await archiveCompletedRows([updatedRow])
      message.value = decision === "SKIP" ? "已跳过该工作簿" : "已将工作簿设为新的有效档案"
    } catch (error) {
      if (!(error instanceof Error)) throw error
      if (isStaleImportDecision(error)) staleItemId.value = itemId
      message.value = errorMessage(error)
    } finally {
      loading.value = false
    }
  }

  async function retryArchive(itemId: ImportItemId): Promise<void> {
    if (loading.value) return
    const row = findImportRow(items.value, itemId)
    if (row === undefined) return
    loading.value = true
    try {
      await archiveCompletedRows([row])
    } finally {
      loading.value = false
    }
  }

  async function archiveCompletedRows(rows: readonly ImportRow[]): Promise<void> {
    for (const row of rows) {
      if (!shouldArchiveWorkbook(row.source, row.status)) continue
      switch (row.source.kind) {
        case "MANUAL":
          continue
        case "AUTO":
          try {
            const result = await window.personnelArchive.archiveScannedWorkbook(row.source.token)
            items.value = replaceImportRow(items.value, row.itemId, {
              ...row,
              localState: archiveLocalState(result),
            })
          } catch (error) {
            if (!(error instanceof Error)) throw error
            items.value = replaceImportRow(items.value, row.itemId, {
              ...row,
              localState: { kind: "AUTO_MOVE_FAILED", message: errorMessage(error) },
            })
          }
          break
        default:
          assertNever(row.source)
      }
    }
  }

  return {
    queuedWorkbooks,
    items,
    loading,
    scanning,
    message,
    scanMessage,
    scanState,
    staleItemId,
    pendingCount,
    chooseFiles,
    scanNow,
    startAutoScan,
    stopAutoScan,
    precheck,
    decide,
    retryArchive,
  }
})

function assertNever(value: never): never {
  throw new TypeError(`未知工作簿来源：${String(value)}`)
}
