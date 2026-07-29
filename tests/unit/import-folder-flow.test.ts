/** 导入文件夹联动测试：锁定自动来源会归档、手动来源永不移动的可观察行为。 */

import type { PersonnelArchiveBridge } from "@shared/ipc-contract"
import { scannedWorkbookTokenSchema } from "@shared/ipc-contract"
import { createPinia, setActivePinia } from "pinia"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { submitDecision, uploadWorkbooks } from "@/features/archive-import/api"
import { importBatchSchema, importItemSchema } from "@/features/archive-import/schemas"
import { useImportStore } from "@/features/archive-import/store"

vi.mock("@/features/archive-import/api", () => ({
  uploadWorkbooks: vi.fn(),
  submitDecision: vi.fn(),
}))

const workbookBytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04])
const token = scannedWorkbookTokenSchema.parse("00000000-0000-4000-8000-000000000001")

function importedBatch(fileName: string) {
  return importBatchSchema.parse({
    batchId: "batch-1",
    items: [
      {
        itemId: "item-1",
        fileName,
        status: "IMPORTED",
        code: "IMPORTED",
        message: "导入成功",
      },
    ],
  })
}

function installBridge(overrides: Partial<PersonnelArchiveBridge>) {
  const archiveScannedWorkbook = vi.fn<PersonnelArchiveBridge["archiveScannedWorkbook"]>()
  archiveScannedWorkbook.mockResolvedValue({ status: "MOVED", archivedName: "档案甲.xlsx" })
  const bridge = {
    selectWorkbooks: vi.fn<PersonnelArchiveBridge["selectWorkbooks"]>().mockResolvedValue([]),
    loadFolderSettings: vi.fn<PersonnelArchiveBridge["loadFolderSettings"]>().mockResolvedValue({
      pendingDirectory: null,
      archiveDirectory: null,
    }),
    selectFolder: vi.fn<PersonnelArchiveBridge["selectFolder"]>(),
    scanPendingWorkbooks: vi
      .fn<PersonnelArchiveBridge["scanPendingWorkbooks"]>()
      .mockResolvedValue({
        state: "READY",
        message: "监测中",
        workbooks: [],
      }),
    archiveScannedWorkbook,
    openArchive: vi.fn<PersonnelArchiveBridge["openArchive"]>(),
    saveArchiveBundle: vi.fn<PersonnelArchiveBridge["saveArchiveBundle"]>(),
    saveRefreshCredential: vi
      .fn<PersonnelArchiveBridge["saveRefreshCredential"]>()
      .mockResolvedValue(),
    loadRefreshCredential: vi
      .fn<PersonnelArchiveBridge["loadRefreshCredential"]>()
      .mockResolvedValue(null),
    clearRefreshCredential: vi
      .fn<PersonnelArchiveBridge["clearRefreshCredential"]>()
      .mockResolvedValue(),
    ...overrides,
  } satisfies PersonnelArchiveBridge
  Object.defineProperty(window, "personnelArchive", { configurable: true, value: bridge })
  return bridge
}

describe("archive import folder flow", () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(uploadWorkbooks).mockReset()
    vi.mocked(submitDecision).mockReset()
  })

  it("moves an automatically scanned workbook after the backend imports it", async () => {
    // Given
    const scanPendingWorkbooks = vi.fn<PersonnelArchiveBridge["scanPendingWorkbooks"]>()
    scanPendingWorkbooks.mockResolvedValue({
      state: "READY",
      message: "已自动加入 1 个工作簿",
      workbooks: [{ name: "档案甲.xlsx", size: 4, bytes: workbookBytes, token }],
    })
    const bridge = installBridge({ scanPendingWorkbooks })
    vi.mocked(uploadWorkbooks).mockResolvedValue(importedBatch("档案甲.xlsx"))
    const store = useImportStore()
    await store.scanNow()

    // When
    await store.precheck()

    // Then
    expect(bridge.archiveScannedWorkbook).toHaveBeenCalledOnce()
    expect(bridge.archiveScannedWorkbook).toHaveBeenCalledWith(token)
    expect(store.items[0]?.localState).toEqual({ kind: "AUTO_MOVED", archivedName: "档案甲.xlsx" })
  })

  it("keeps a manually selected workbook at its original path after import", async () => {
    // Given
    const selectWorkbooks = vi.fn<PersonnelArchiveBridge["selectWorkbooks"]>()
    selectWorkbooks.mockResolvedValue([{ name: "手动档案.xlsx", size: 4, bytes: workbookBytes }])
    const bridge = installBridge({ selectWorkbooks })
    vi.mocked(uploadWorkbooks).mockResolvedValue(importedBatch("手动档案.xlsx"))
    const store = useImportStore()
    await store.chooseFiles()

    // When
    await store.precheck()

    // Then
    expect(bridge.archiveScannedWorkbook).not.toHaveBeenCalled()
    expect(store.items[0]?.localState).toEqual({ kind: "MANUAL_RETAINED" })
  })

  it("keeps a duplicate manual workbook pending until the user chooses", async () => {
    // Given
    const selectWorkbooks = vi.fn<PersonnelArchiveBridge["selectWorkbooks"]>()
    selectWorkbooks.mockResolvedValue([
      { name: "手动重复档案.xlsx", size: 4, bytes: workbookBytes },
    ])
    const bridge = installBridge({ selectWorkbooks })
    vi.mocked(uploadWorkbooks).mockResolvedValue(
      importBatchSchema.parse({
        batchId: "batch-duplicate-manual",
        items: [
          {
            itemId: "item-duplicate-manual",
            fileName: "手动重复档案.xlsx",
            status: "PENDING_DECISION",
            code: "DUPLICATE_REQUIRES_DECISION",
            message: "档案已存在，请选择覆盖或跳过",
            duplicate: {
              personName: "测试甲",
              identityCardLastFour: "0012",
              existingEmployeeNo: "",
              incomingEmployeeNo: "",
              existingUpdatedAt: "2026-07-22T03:00:00Z",
            },
          },
        ],
      }),
    )
    const store = useImportStore()
    await store.chooseFiles()

    // When
    await store.precheck()

    // Then
    expect(store.items[0]?.status).toBe("PENDING_DECISION")
    expect(bridge.archiveScannedWorkbook).not.toHaveBeenCalled()
    expect(store.items[0]?.localState).toEqual({ kind: "MANUAL_RETAINED" })
  })

  it("clears the page message after skipping a duplicate workbook", async () => {
    const selectWorkbooks = vi.fn<PersonnelArchiveBridge["selectWorkbooks"]>()
    selectWorkbooks.mockResolvedValue([
      { name: "手动重复档案.xlsx", size: 4, bytes: workbookBytes },
    ])
    installBridge({ selectWorkbooks })
    vi.mocked(uploadWorkbooks).mockResolvedValue(
      importBatchSchema.parse({
        batchId: "batch-skip-manual",
        items: [
          {
            itemId: "item-skip-manual",
            fileName: "手动重复档案.xlsx",
            status: "PENDING_DECISION",
            code: "DUPLICATE_REQUIRES_DECISION",
            message: "档案已存在，请选择覆盖或跳过",
          },
        ],
      }),
    )
    vi.mocked(submitDecision).mockResolvedValue(
      importItemSchema.parse({
        itemId: "item-skip-manual",
        fileName: "手动重复档案.xlsx",
        status: "SKIPPED",
        code: "SKIPPED",
        message: "已跳过，档案未变更",
      }),
    )
    const store = useImportStore()
    await store.chooseFiles()
    await store.precheck()
    const pending = store.items[0]
    if (pending === undefined) throw new TypeError("测试缺少待确认条目")

    await store.decide(pending.itemId, "SKIP")

    expect(store.message).toBe("")
    expect(store.items[0]?.status).toBe("SKIPPED")
  })

  it("shows a retryable local state when moving an imported automatic file fails", async () => {
    // Given
    const scanPendingWorkbooks = vi.fn<PersonnelArchiveBridge["scanPendingWorkbooks"]>()
    scanPendingWorkbooks.mockResolvedValue({
      state: "READY",
      message: "已自动加入 1 个工作簿",
      workbooks: [{ name: "档案甲.xlsx", size: 4, bytes: workbookBytes, token }],
    })
    const archiveScannedWorkbook = vi.fn<PersonnelArchiveBridge["archiveScannedWorkbook"]>()
    archiveScannedWorkbook.mockResolvedValue({ status: "FAILED", message: "原文件已保留" })
    installBridge({ scanPendingWorkbooks, archiveScannedWorkbook })
    vi.mocked(uploadWorkbooks).mockResolvedValue(importedBatch("档案甲.xlsx"))
    const store = useImportStore()
    await store.scanNow()

    // When
    await store.precheck()

    // Then
    expect(store.items[0]?.localState).toEqual({
      kind: "AUTO_MOVE_FAILED",
      message: "原文件已保留",
    })
  })

  it("waits for an explicit overwrite result before archiving a duplicate automatic file", async () => {
    // Given
    const scanPendingWorkbooks = vi.fn<PersonnelArchiveBridge["scanPendingWorkbooks"]>()
    scanPendingWorkbooks.mockResolvedValue({
      state: "READY",
      message: "已自动加入 1 个工作簿",
      workbooks: [{ name: "档案甲.xlsx", size: 4, bytes: workbookBytes, token }],
    })
    const bridge = installBridge({ scanPendingWorkbooks })
    vi.mocked(uploadWorkbooks).mockResolvedValue(
      importBatchSchema.parse({
        batchId: "batch-1",
        items: [
          {
            itemId: "item-1",
            fileName: "档案甲.xlsx",
            status: "PENDING_DECISION",
            code: "DUPLICATE_REQUIRES_DECISION",
            message: "需要确认",
          },
        ],
      }),
    )
    vi.mocked(submitDecision).mockResolvedValue(
      importItemSchema.parse({
        itemId: "item-1",
        fileName: "档案甲.xlsx",
        status: "OVERWRITTEN",
        code: "OVERWRITTEN",
        message: "覆盖成功",
      }),
    )
    const store = useImportStore()
    await store.scanNow()
    await store.precheck()
    const pending = store.items[0]
    if (pending === undefined) throw new TypeError("测试缺少待确认条目")
    expect(bridge.archiveScannedWorkbook).not.toHaveBeenCalled()

    // When
    await store.decide(pending.itemId, "OVERWRITE")

    // Then
    expect(bridge.archiveScannedWorkbook).toHaveBeenCalledOnce()
    expect(store.items[0]?.localState).toEqual({
      kind: "AUTO_MOVED",
      archivedName: "档案甲.xlsx",
    })
    expect(store.message).toBe("已将工作簿设为新的有效档案")
  })
})
