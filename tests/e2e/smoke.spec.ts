/** Electron 冒烟测试：以构建产物验证安全窗口，以及真实 preload IPC 的扫描归档路径。 */
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { _electron as electron, expect, test } from "@playwright/test"
import type { PersonnelArchiveBridge } from "../../src/shared/ipc-contract"

declare const personnelArchive: PersonnelArchiveBridge

test("opens the secure login shell", async () => {
  const userDataDirectory = await mkdtemp(join(tmpdir(), "personnel-archive-e2e-"))
  try {
    const application = await electron.launch({
      args: [".", `--user-data-dir=${userDataDirectory}`],
    })
    try {
      const page = await application.firstWindow()
      await expect(page).toHaveTitle("人员档案助手")
      await expect(page.getByRole("heading", { name: "用户登录" })).toBeVisible()
    } finally {
      await application.close()
    }
  } finally {
    await rm(userDataDirectory, { recursive: true, force: true })
  }
})

test("scans and archives a configured workbook without overwriting an existing file", async () => {
  // Given
  const root = await mkdtemp(join(tmpdir(), "personnel-archive-folder-e2e-"))
  const userDataDirectory = join(root, "user-data")
  const pendingDirectory = join(root, "pending")
  const archiveDirectory = join(root, "archive")
  const workbookBytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x01])
  await Promise.all([mkdir(userDataDirectory), mkdir(pendingDirectory), mkdir(archiveDirectory)])
  await writeFile(
    join(userDataDirectory, "folder-settings.json"),
    JSON.stringify({ pendingDirectory, archiveDirectory }),
  )
  await writeFile(join(pendingDirectory, "档案甲.xlsx"), workbookBytes)
  await writeFile(join(archiveDirectory, "档案甲.xlsx"), new Uint8Array([9]))

  try {
    const application = await electron.launch({
      args: [".", `--user-data-dir=${userDataDirectory}`],
    })
    try {
      const page = await application.firstWindow()

      // When
      const outcome = await page.evaluate(async () => {
        const scan = await personnelArchive.scanPendingWorkbooks(10)
        const workbook = scan.workbooks[0]
        if (workbook === undefined) return { status: "NOT_FOUND", archivedName: "" }
        const archived = await personnelArchive.archiveScannedWorkbook(workbook.token)
        switch (archived.status) {
          case "MOVED":
            return archived
          case "FAILED":
            return { status: archived.status, archivedName: "" }
        }
      })

      // Then
      expect(outcome).toEqual({ status: "MOVED", archivedName: "档案甲 (1).xlsx" })
      await expect(access(join(pendingDirectory, "档案甲.xlsx"))).rejects.toThrow()
      expect(await readFile(join(archiveDirectory, "档案甲.xlsx"))).toEqual(Buffer.from([9]))
      expect(await readFile(join(archiveDirectory, "档案甲 (1).xlsx"))).toEqual(
        Buffer.from(workbookBytes),
      )
    } finally {
      await application.close()
    }
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test("saves a validated batch export bundle through the real IPC boundary", async () => {
  // Given
  const root = await mkdtemp(join(tmpdir(), "personnel-archive-batch-export-e2e-"))
  const userDataDirectory = join(root, "user-data")
  const bundlePath = join(root, "人员档案批量导出.zip")
  await mkdir(userDataDirectory)
  const bundleBytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x01])

  try {
    const application = await electron.launch({
      args: [".", `--user-data-dir=${userDataDirectory}`],
    })
    try {
      const page = await application.firstWindow()
      await application.evaluate(({ dialog }, targetPath) => {
        Object.defineProperty(dialog, "showSaveDialog", {
          configurable: true,
          value: async () => ({ canceled: false, filePath: targetPath }),
        })
      }, bundlePath)

      // When
      const result = await page.evaluate(
        async (bytes) =>
          personnelArchive.saveArchiveBundle({
            suggestedName: "人员档案批量导出.zip",
            bytes: new Uint8Array(bytes),
          }),
        Array.from(bundleBytes),
      )

      // Then
      expect(result).toEqual({ status: "SAVED", fileName: "人员档案批量导出.zip" })
      expect(await readFile(bundlePath)).toEqual(Buffer.from(bundleBytes))
    } finally {
      await application.close()
    }
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
