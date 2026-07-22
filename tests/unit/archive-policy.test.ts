/** 自动归档策略测试：只有自动来源且最终写入成功的工作簿才允许移动。 */

import { scannedWorkbookTokenSchema } from "@shared/ipc-contract"
import { describe, expect, it } from "vitest"
import { shouldArchiveWorkbook } from "@/features/archive-import/archive-policy"
import type { ImportStatus } from "@/features/archive-import/schemas"

const token = scannedWorkbookTokenSchema.parse("00000000-0000-4000-8000-000000000001")

describe("automatic archive policy", () => {
  it("never archives a manually selected workbook", () => {
    // Given
    const source = { kind: "MANUAL" } as const

    // When
    const shouldArchive = shouldArchiveWorkbook(source, "IMPORTED")

    // Then
    expect(shouldArchive).toBe(false)
  })

  it("archives an automatically scanned workbook after a completed import", () => {
    // Given
    const source = {
      kind: "AUTO",
      token,
    } as const

    // When
    const newlyImported = shouldArchiveWorkbook(source, "IMPORTED")
    const overwritten = shouldArchiveWorkbook(source, "OVERWRITTEN")

    // Then
    expect(newlyImported).toBe(true)
    expect(overwritten).toBe(true)
  })

  it("keeps an automatically scanned workbook for pending, skipped, or failed results", () => {
    // Given
    const source = {
      kind: "AUTO",
      token,
    } as const

    // When
    const statuses = ["PENDING_DECISION", "SKIPPED", "FAILED"] satisfies readonly ImportStatus[]
    const outcomes = statuses.map((status) => shouldArchiveWorkbook(source, status))

    // Then
    expect(outcomes).toEqual([false, false, false])
  })
})
