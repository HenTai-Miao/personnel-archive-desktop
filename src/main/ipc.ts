/**
 * Electron IPC 权限边界：只向当前主窗口提供具名文件与凭据操作，并在主进程重新校验输入。
 */
import { readFile, stat } from "node:fs/promises"
import { basename, extname, join } from "node:path"
import { app, type BrowserWindow, dialog, type IpcMainInvokeEvent, ipcMain } from "electron"
import {
  folderKindSchema,
  IPC_CHANNELS,
  MAX_IMPORT_WORKBOOK_BYTES,
  selectedWorkbookListSchema,
} from "../shared/ipc-contract"
import { saveArchiveBundle } from "./archive-bundle"
import { FolderSettingsConflictError, FolderSettingsRepository } from "./folder-settings"
import { FolderWorkflow } from "./folder-workflow"
import {
  clearRefreshCredential,
  loadRefreshCredential,
  saveRefreshCredential,
} from "./session-storage"
import { writeAndOpenWorkbook } from "./temp-files"

function assertTrustedSender(event: IpcMainInvokeEvent, window: BrowserWindow): void {
  // 不能只依赖 channel 名；子 frame 或意外创建的 webContents 也不得调用本地文件能力。
  if (
    event.sender.id !== window.webContents.id ||
    event.senderFrame !== window.webContents.mainFrame
  ) {
    throw new UntrustedIpcSenderError()
  }
}

export function registerIpcHandlers(window: BrowserWindow): void {
  const folderSettings = new FolderSettingsRepository(
    join(app.getPath("userData"), "folder-settings.json"),
  )
  const folderWorkflow = new FolderWorkflow(() => folderSettings.load())

  ipcMain.handle(IPC_CHANNELS.selectWorkbooks, async (event) => {
    assertTrustedSender(event, window)
    const selection = await dialog.showOpenDialog(window, {
      title: "选择人员档案工作簿",
      properties: ["openFile", "multiSelections"],
      filters: [{ name: "Excel 工作簿", extensions: ["xlsx"] }],
    })
    if (selection.canceled) return []
    if (selection.filePaths.length > 100)
      throw new InvalidWorkbookError("每批最多选择 100 个工作簿")
    // 文件选择器过滤只是用户体验；读取前仍检查真实路径后缀和磁盘元数据。
    const workbooks = await Promise.all(
      selection.filePaths.map(async (path) => {
        if (extname(path).toLowerCase() !== ".xlsx") throw new InvalidWorkbookError()
        const metadata = await stat(path)
        if (metadata.size <= 0 || metadata.size > MAX_IMPORT_WORKBOOK_BYTES) {
          throw new InvalidWorkbookError("工作簿大小必须在 1 字节到 12 MiB 之间")
        }
        // renderer 只收到本次用户明确选择的字节，不会获得可复用的任意文件路径。
        const bytes = await readFile(path)
        return { name: basename(path), size: metadata.size, bytes }
      }),
    )
    // ZIP 签名和总数在跨进程返回前再次由共享契约验证。
    return selectedWorkbookListSchema.parse(workbooks)
  })
  ipcMain.handle(IPC_CHANNELS.loadFolderSettings, async (event) => {
    assertTrustedSender(event, window)
    return folderSettings.load()
  })
  ipcMain.handle(IPC_CHANNELS.selectFolder, async (event, input: unknown) => {
    assertTrustedSender(event, window)
    const kind = folderKindSchema.parse(input)
    const current = await folderSettings.load()
    const selection = await dialog.showOpenDialog(window, {
      title: kind === "PENDING" ? "选择待上传文件夹" : "选择上传完成归档文件夹",
      properties: ["openDirectory", "createDirectory"],
    })
    const selectedDirectory = selection.filePaths[0]
    if (selection.canceled || selectedDirectory === undefined) {
      return { status: "CANCELED", settings: current }
    }
    try {
      const settings = await folderSettings.update(kind, selectedDirectory)
      return { status: "SAVED", settings }
    } catch (error) {
      if (error instanceof FolderSettingsConflictError) {
        return { status: "REJECTED", settings: current, message: error.message }
      }
      throw error
    }
  })
  ipcMain.handle(IPC_CHANNELS.scanPendingWorkbooks, async (event, input: unknown) => {
    assertTrustedSender(event, window)
    return folderWorkflow.scan(input)
  })
  ipcMain.handle(IPC_CHANNELS.archiveScannedWorkbook, async (event, input: unknown) => {
    assertTrustedSender(event, window)
    return folderWorkflow.archive(input)
  })
  ipcMain.handle(IPC_CHANNELS.openArchive, async (event, input: unknown) => {
    assertTrustedSender(event, window)
    return writeAndOpenWorkbook(input)
  })
  ipcMain.handle(IPC_CHANNELS.saveArchiveBundle, async (event, input: unknown) => {
    assertTrustedSender(event, window)
    return saveArchiveBundle(window, input)
  })
  ipcMain.handle(IPC_CHANNELS.saveRefreshCredential, async (event, input: unknown) => {
    assertTrustedSender(event, window)
    await saveRefreshCredential(input)
  })
  ipcMain.handle(IPC_CHANNELS.loadRefreshCredential, async (event) => {
    assertTrustedSender(event, window)
    return loadRefreshCredential()
  })
  ipcMain.handle(IPC_CHANNELS.clearRefreshCredential, async (event) => {
    assertTrustedSender(event, window)
    await clearRefreshCredential()
  })
}

class UntrustedIpcSenderError extends Error {
  readonly name = "UntrustedIpcSenderError"
  constructor() {
    super("IPC sender is not the active application frame")
  }
}

class InvalidWorkbookError extends Error {
  readonly name = "InvalidWorkbookError"
  constructor(message = "Only .xlsx workbooks can be selected") {
    super(message)
  }
}
