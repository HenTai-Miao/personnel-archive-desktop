/**
 * preload 是 renderer 与 Electron 主进程之间唯一桥梁，只暴露固定、可校验的领域方法。
 */
import { contextBridge, ipcRenderer } from "electron"
import {
  archiveScannedWorkbookResultSchema,
  folderKindSchema,
  folderScanLimitSchema,
  folderScanResultSchema,
  folderSelectionResultSchema,
  folderSettingsSchema,
  IPC_CHANNELS,
  openArchiveRequestSchema,
  openArchiveResultSchema,
  type PersonnelArchiveBridge,
  refreshCredentialSchema,
  saveArchiveBundleRequestSchema,
  saveArchiveBundleResultSchema,
  scannedWorkbookTokenSchema,
  selectedWorkbookListSchema,
} from "../shared/ipc-contract"

const bridge: PersonnelArchiveBridge = {
  async selectWorkbooks() {
    const result: unknown = await ipcRenderer.invoke(IPC_CHANNELS.selectWorkbooks)
    // 即使结果来自本应用主进程，也在进入 renderer 前按运行时契约校验。
    return selectedWorkbookListSchema.parse(result)
  },
  async loadFolderSettings() {
    const result: unknown = await ipcRenderer.invoke(IPC_CHANNELS.loadFolderSettings)
    return folderSettingsSchema.parse(result)
  },
  async selectFolder(input) {
    const kind = folderKindSchema.parse(input)
    const result: unknown = await ipcRenderer.invoke(IPC_CHANNELS.selectFolder, kind)
    return folderSelectionResultSchema.parse(result)
  },
  async scanPendingWorkbooks(input) {
    const limit = folderScanLimitSchema.parse(input)
    const result: unknown = await ipcRenderer.invoke(IPC_CHANNELS.scanPendingWorkbooks, limit)
    return folderScanResultSchema.parse(result)
  },
  async archiveScannedWorkbook(input) {
    const token = scannedWorkbookTokenSchema.parse(input)
    const result: unknown = await ipcRenderer.invoke(IPC_CHANNELS.archiveScannedWorkbook, token)
    return archiveScannedWorkbookResultSchema.parse(result)
  },
  async openArchive(input) {
    // 输入和输出都校验，避免 TypeScript 编译期类型被运行时对象绕过。
    const request = openArchiveRequestSchema.parse(input)
    const result: unknown = await ipcRenderer.invoke(IPC_CHANNELS.openArchive, request)
    return openArchiveResultSchema.parse(result)
  },
  async saveArchiveBundle(input) {
    const request = saveArchiveBundleRequestSchema.parse(input)
    const result: unknown = await ipcRenderer.invoke(IPC_CHANNELS.saveArchiveBundle, request)
    return saveArchiveBundleResultSchema.parse(result)
  },
  async saveRefreshCredential(input) {
    const credential = refreshCredentialSchema.parse(input)
    await ipcRenderer.invoke(IPC_CHANNELS.saveRefreshCredential, credential)
  },
  async loadRefreshCredential() {
    const result: unknown = await ipcRenderer.invoke(IPC_CHANNELS.loadRefreshCredential)
    return zodNullableCredential(result)
  },
  async clearRefreshCredential() {
    await ipcRenderer.invoke(IPC_CHANNELS.clearRefreshCredential)
  },
}

function zodNullableCredential(input: unknown): string | null {
  if (input === null) return null
  return refreshCredentialSchema.parse(input)
}

// 暴露具体能力而不是 ipcRenderer，renderer 因而不能自行选择任意 channel。
contextBridge.exposeInMainWorld("personnelArchive", bridge)
