/** IPC 契约测试：覆盖 XLSX 签名、大小、数量和安全建议文件名边界。 */
import {
  archiveScannedWorkbookResultSchema,
  folderScanResultSchema,
  folderSettingsSchema,
  openArchiveRequestSchema,
  saveArchiveBundleRequestSchema,
  selectedWorkbookListSchema,
} from "@shared/ipc-contract"
import { describe, expect, it } from "vitest"

describe("IPC contracts", () => {
  it("rejects executable archive names", () => {
    const result = openArchiveRequestSchema.safeParse({
      suggestedName: "archive.exe",
      bytes: new Uint8Array([1, 2]),
    })
    expect(result.success).toBe(false)
  })

  it("accepts a bounded xlsx selection", () => {
    const result = selectedWorkbookListSchema.safeParse([
      { name: "测试档案.xlsx", size: 4, bytes: new Uint8Array([0x50, 0x4b, 0x03, 0x04]) },
    ])
    expect(result.success).toBe(true)
  })

  it("accepts only a safe zip bundle at the native save boundary", () => {
    // Given
    const zipBytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04])

    // When
    const valid = saveArchiveBundleRequestSchema.safeParse({
      suggestedName: "人员档案批量导出-20260722.zip",
      bytes: zipBytes,
    })
    const executable = saveArchiveBundleRequestSchema.safeParse({
      suggestedName: "人员档案.exe",
      bytes: zipBytes,
    })
    const fakeZip = saveArchiveBundleRequestSchema.safeParse({
      suggestedName: "人员档案.zip",
      bytes: new Uint8Array([1, 2, 3, 4]),
    })

    // Then
    expect(valid.success).toBe(true)
    expect(executable.success).toBe(false)
    expect(fakeZip.success).toBe(false)
  })

  it("accepts configured folder settings and rejects incomplete objects", () => {
    // Given
    const configured = { pendingDirectory: "/pending", archiveDirectory: "/archive" }

    // When
    const valid = folderSettingsSchema.safeParse(configured)
    const missingArchive = folderSettingsSchema.safeParse({ pendingDirectory: "/pending" })
    const relativePath = folderSettingsSchema.safeParse({
      pendingDirectory: "pending",
      archiveDirectory: "/archive",
    })

    // Then
    expect(valid.success).toBe(true)
    expect(missingArchive.success).toBe(false)
    expect(relativePath.success).toBe(false)
  })

  it("rejects malformed scan and archive responses at the preload boundary", () => {
    // Given
    const malformedScan = { state: "READY", message: "ok", workbooks: [{ name: "bad.exe" }] }
    const malformedArchive = { status: "MOVED", archivedName: "" }

    // When
    const scan = folderScanResultSchema.safeParse(malformedScan)
    const archive = archiveScannedWorkbookResultSchema.safeParse(malformedArchive)

    // Then
    expect(scan.success).toBe(false)
    expect(archive.success).toBe(false)
  })
})
