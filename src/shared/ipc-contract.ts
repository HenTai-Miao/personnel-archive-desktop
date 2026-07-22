/**
 * 三个 Electron 进程共享的 IPC 运行时契约；此文件不得依赖 DOM、Vue 或 Node 文件系统。
 */
import { z } from "zod"

export const MAX_IMPORT_WORKBOOK_BYTES = 12 * 1024 * 1024
export const MAX_ARCHIVE_BUNDLE_BYTES = 105 * 1024 * 1024

export const selectedWorkbookSchema = z
  .object({
    name: z
      .string()
      .min(1)
      .max(255)
      .regex(/\.xlsx$/i),
    size: z.number().int().positive().max(MAX_IMPORT_WORKBOOK_BYTES),
    bytes: z.instanceof(Uint8Array).refine(hasZipContainerSignature),
  })
  .strict()

export const selectedWorkbookListSchema = z.array(selectedWorkbookSchema).max(100)

const directoryPathSchema = z
  .string()
  .min(1)
  .max(4096)
  .refine((value) => !value.includes("\0"))
  .refine((value) => /^(?:[a-z]:[\\/]|\\\\|\/)/i.test(value))

export const folderKindSchema = z.enum(["PENDING", "ARCHIVE"])

export const folderSettingsSchema = z
  .object({
    pendingDirectory: directoryPathSchema.nullable(),
    archiveDirectory: directoryPathSchema.nullable(),
  })
  .strict()

export const folderSelectionResultSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("CANCELED"), settings: folderSettingsSchema }).strict(),
  z.object({ status: z.literal("SAVED"), settings: folderSettingsSchema }).strict(),
  z
    .object({
      status: z.literal("REJECTED"),
      settings: folderSettingsSchema,
      message: z.string().min(1),
    })
    .strict(),
])

export const scannedWorkbookTokenSchema = z.string().uuid().brand("ScannedWorkbookToken")

export const scannedWorkbookSchema = selectedWorkbookSchema.extend({
  token: scannedWorkbookTokenSchema,
})

export const folderScanLimitSchema = z.number().int().min(0).max(100)

export const folderScanResultSchema = z
  .object({
    state: z.enum(["UNCONFIGURED", "PENDING_DIRECTORY_MISSING", "READY", "FAILED"]),
    message: z.string(),
    workbooks: z.array(scannedWorkbookSchema).max(100),
  })
  .strict()

export const archiveScannedWorkbookResultSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("MOVED"), archivedName: z.string().min(1).max(255) }).strict(),
  z.object({ status: z.literal("FAILED"), message: z.string().min(1) }).strict(),
])

export const openArchiveRequestSchema = z
  .object({
    suggestedName: z
      .string()
      .min(1)
      .max(180)
      .regex(/^[^\\/:*?"<>|]+\.xlsx$/i),
    bytes: z
      .instanceof(Uint8Array)
      .refine((value) => value.byteLength <= 50 * 1024 * 1024)
      .refine(hasZipContainerSignature),
  })
  .strict()

export const openArchiveResultSchema = z
  .object({
    opened: z.boolean(),
    message: z.string(),
  })
  .strict()

export const saveArchiveBundleRequestSchema = z
  .object({
    suggestedName: z
      .string()
      .min(1)
      .max(180)
      .regex(/^[^\\/:*?"<>|]+\.zip$/i),
    bytes: z
      .instanceof(Uint8Array)
      .refine((value) => value.byteLength <= MAX_ARCHIVE_BUNDLE_BYTES)
      .refine(hasZipContainerSignature),
  })
  .strict()

export const saveArchiveBundleResultSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("CANCELED") }).strict(),
  z.object({ status: z.literal("SAVED"), fileName: z.string().min(1).max(255) }).strict(),
])

export const refreshCredentialSchema = z.string().min(1).max(8192)

export type SelectedWorkbook = z.infer<typeof selectedWorkbookSchema>
export type OpenArchiveRequest = z.infer<typeof openArchiveRequestSchema>
export type OpenArchiveResult = z.infer<typeof openArchiveResultSchema>
export type SaveArchiveBundleRequest = z.infer<typeof saveArchiveBundleRequestSchema>
export type SaveArchiveBundleResult = z.infer<typeof saveArchiveBundleResultSchema>
export type FolderKind = z.infer<typeof folderKindSchema>
export type FolderSettings = z.infer<typeof folderSettingsSchema>
export type FolderSelectionResult = z.infer<typeof folderSelectionResultSchema>
export type ScannedWorkbookToken = z.infer<typeof scannedWorkbookTokenSchema>
export type ScannedWorkbook = z.infer<typeof scannedWorkbookSchema>
export type FolderScanResult = z.infer<typeof folderScanResultSchema>
export type ArchiveScannedWorkbookResult = z.infer<typeof archiveScannedWorkbookResultSchema>

export interface PersonnelArchiveBridge {
  selectWorkbooks(): Promise<readonly SelectedWorkbook[]>
  loadFolderSettings(): Promise<FolderSettings>
  selectFolder(kind: FolderKind): Promise<FolderSelectionResult>
  scanPendingWorkbooks(limit: number): Promise<FolderScanResult>
  archiveScannedWorkbook(token: ScannedWorkbookToken): Promise<ArchiveScannedWorkbookResult>
  openArchive(request: OpenArchiveRequest): Promise<OpenArchiveResult>
  saveArchiveBundle(request: SaveArchiveBundleRequest): Promise<SaveArchiveBundleResult>
  saveRefreshCredential(credential: string): Promise<void>
  loadRefreshCredential(): Promise<string | null>
  clearRefreshCredential(): Promise<void>
}

export const IPC_CHANNELS = {
  selectWorkbooks: "archive:select-workbooks",
  loadFolderSettings: "folders:load-settings",
  selectFolder: "folders:select-folder",
  scanPendingWorkbooks: "folders:scan-pending-workbooks",
  archiveScannedWorkbook: "folders:archive-scanned-workbook",
  openArchive: "archive:open-workbook",
  saveArchiveBundle: "archive:save-bundle",
  saveRefreshCredential: "session:save-refresh-credential",
  loadRefreshCredential: "session:load-refresh-credential",
  clearRefreshCredential: "session:clear-refresh-credential",
} as const

function hasZipContainerSignature(bytes: Uint8Array): boolean {
  // XLSX 和批量档案包都是 ZIP 容器；签名检查用于快速拒绝伪扩展名。
  return (
    bytes.byteLength >= 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    bytes[2] === 0x03 &&
    bytes[3] === 0x04
  )
}
