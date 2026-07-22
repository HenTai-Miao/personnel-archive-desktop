/** 待上传目录工作流：扫描受限 XLSX，并用一次性令牌完成可重试且不覆盖的归档移动。 */
import { createHash, randomUUID } from "node:crypto"
import { constants, type Dirent } from "node:fs"
import { copyFile, mkdir, readdir, readFile, stat, unlink } from "node:fs/promises"
import { basename, extname, join, parse } from "node:path"
import { ZodError } from "zod"
import {
  type ArchiveScannedWorkbookResult,
  type FolderScanResult,
  type FolderSettings,
  folderScanLimitSchema,
  scannedWorkbookTokenSchema,
  selectedWorkbookSchema,
} from "../shared/ipc-contract"

type RegisteredWorkbook = {
  readonly token: string
  readonly sourcePath: string
  readonly name: string
  readonly size: number
  readonly digest: string
  readonly archiveDirectory: string
}

type SettingsLoader = () => Promise<FolderSettings>
type TokenFactory = () => string

export class FolderWorkflow {
  /** 这两个 Map 是进程生命周期队列注册表；可变性正是它们的职责。 */
  private readonly workbooksByToken = new Map<string, RegisteredWorkbook>()
  private readonly tokensByPath = new Map<string, string>()

  constructor(
    private readonly loadSettings: SettingsLoader,
    private readonly createToken: TokenFactory = randomUUID,
  ) {}

  async scan(limitInput: unknown): Promise<FolderScanResult> {
    const limit = folderScanLimitSchema.parse(limitInput)
    const settings = await this.loadSettings()
    if (settings.pendingDirectory === null || settings.archiveDirectory === null) {
      return scanResult("UNCONFIGURED", "请先设置待上传文件夹和归档文件夹")
    }

    let entries: readonly Dirent<string>[]
    try {
      entries = await readdir(settings.pendingDirectory, { withFileTypes: true })
    } catch (error) {
      if (isNodeError(error, "ENOENT")) {
        return scanResult("PENDING_DIRECTORY_MISSING", "待上传文件夹不存在，请重新选择")
      }
      if (error instanceof Error) return scanResult("FAILED", "无法读取待上传文件夹")
      throw error
    }

    const workbooks = []
    const candidates = entries
      .filter(
        (entry) =>
          entry.isFile() &&
          !entry.name.startsWith(".") &&
          !entry.name.startsWith("~$") &&
          extname(entry.name).toLowerCase() === ".xlsx",
      )
      .sort((left, right) => left.name.localeCompare(right.name, "zh-CN"))

    for (const candidate of candidates) {
      if (workbooks.length >= limit) break
      const sourcePath = join(settings.pendingDirectory, candidate.name)
      if (this.tokensByPath.has(sourcePath)) continue
      try {
        const metadata = await stat(sourcePath)
        if (!metadata.isFile()) continue
        const bytes = await readFile(sourcePath)
        const workbook = selectedWorkbookSchema.parse({
          name: basename(sourcePath),
          size: metadata.size,
          bytes,
        })
        const token = scannedWorkbookTokenSchema.parse(this.createToken())
        const registered = {
          token,
          sourcePath,
          name: workbook.name,
          size: workbook.size,
          digest: digest(bytes),
          archiveDirectory: settings.archiveDirectory,
        } satisfies RegisteredWorkbook
        this.workbooksByToken.set(token, registered)
        this.tokensByPath.set(sourcePath, token)
        workbooks.push({ ...workbook, token })
      } catch (error) {
        if (error instanceof ZodError || isExpectedFileReadError(error)) continue
        throw error
      }
    }

    const message =
      workbooks.length === 0 ? "待上传文件夹监测中" : `已自动加入 ${workbooks.length} 个工作簿`
    return { state: "READY", message, workbooks }
  }

  async archive(tokenInput: unknown): Promise<ArchiveScannedWorkbookResult> {
    const token = scannedWorkbookTokenSchema.parse(tokenInput)
    const registered = this.workbooksByToken.get(token)
    if (registered === undefined) {
      return { status: "FAILED", message: "归档任务已失效，请重新扫描该文件" }
    }

    try {
      const currentBytes = await readFile(registered.sourcePath)
      if (
        currentBytes.byteLength !== registered.size ||
        digest(currentBytes) !== registered.digest
      ) {
        this.forget(registered)
        return { status: "FAILED", message: "源文件在上传后发生变化，已保留并等待重新扫描" }
      }
      await mkdir(registered.archiveDirectory, { recursive: true })
      const archivedPath = await copyToAvailableName(
        registered.sourcePath,
        registered.archiveDirectory,
        registered.name,
      )
      try {
        await unlink(registered.sourcePath)
      } catch (error) {
        if (!(error instanceof Error)) throw error
        await rollbackCopiedFile(archivedPath)
        return { status: "FAILED", message: "无法移除源文件，原文件已保留" }
      }
      this.forget(registered)
      return { status: "MOVED", archivedName: basename(archivedPath) }
    } catch (error) {
      if (error instanceof Error) {
        return { status: "FAILED", message: "自动归档失败，原文件仍保留在待上传文件夹" }
      }
      throw error
    }
  }

  private forget(workbook: RegisteredWorkbook): void {
    this.workbooksByToken.delete(workbook.token)
    this.tokensByPath.delete(workbook.sourcePath)
  }
}

async function copyToAvailableName(
  sourcePath: string,
  archiveDirectory: string,
  fileName: string,
): Promise<string> {
  const file = parse(fileName)
  for (let sequence = 0; sequence <= 9999; sequence += 1) {
    const suffix = sequence === 0 ? "" : ` (${sequence})`
    const destination = join(archiveDirectory, `${file.name}${suffix}${file.ext}`)
    try {
      // COPYFILE_EXCL 在同盘和跨盘都能原子拒绝同名目标，避免 rename 的覆盖语义。
      await copyFile(sourcePath, destination, constants.COPYFILE_EXCL)
      return destination
    } catch (error) {
      if (isNodeError(error, "EEXIST")) continue
      throw error
    }
  }
  throw new ArchiveNameExhaustedError(fileName)
}

async function rollbackCopiedFile(path: string): Promise<void> {
  try {
    await unlink(path)
  } catch (error) {
    // 回滚文件由本次操作创建；即使清理也失败，源文件仍不会被删除。
    if (error instanceof Error) return
    throw error
  }
}

function scanResult(
  state: "UNCONFIGURED" | "PENDING_DIRECTORY_MISSING" | "FAILED",
  message: string,
): FolderScanResult {
  return { state, message, workbooks: [] }
}

function digest(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex")
}

function isExpectedFileReadError(error: unknown): boolean {
  return ["ENOENT", "EACCES", "EPERM"].some((code) => isNodeError(error, code))
}

function isNodeError(error: unknown, code: string): boolean {
  return error instanceof Error && "code" in error && error.code === code
}

class ArchiveNameExhaustedError extends Error {
  readonly name = "ArchiveNameExhaustedError"

  constructor(readonly fileName: string) {
    super(`归档目录中同名文件过多：${fileName}`)
  }
}
