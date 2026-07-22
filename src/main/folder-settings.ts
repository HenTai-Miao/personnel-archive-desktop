/** 本地文件夹设置存储：只保存用户通过系统目录选择器明确授权的两个目录。 */
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, isAbsolute, relative, resolve } from "node:path"
import { ZodError } from "zod"
import { type FolderKind, type FolderSettings, folderSettingsSchema } from "../shared/ipc-contract"

const EMPTY_SETTINGS: FolderSettings = {
  pendingDirectory: null,
  archiveDirectory: null,
}

export class FolderSettingsRepository {
  constructor(private readonly settingsPath: string) {}

  async load(): Promise<FolderSettings> {
    try {
      const serialized = await readFile(this.settingsPath, "utf8")
      const decoded: unknown = JSON.parse(serialized)
      return folderSettingsSchema.parse(decoded)
    } catch (error) {
      if (isNodeError(error, "ENOENT")) return EMPTY_SETTINGS
      if (error instanceof SyntaxError || error instanceof ZodError) {
        // 损坏配置不应把用户锁在设置页外；回到未配置状态后下一次选择会覆盖它。
        return EMPTY_SETTINGS
      }
      if (error instanceof Error) {
        throw new FolderSettingsStorageError("无法读取文件夹设置", error)
      }
      throw error
    }
  }

  async update(kind: FolderKind, selectedDirectory: string): Promise<FolderSettings> {
    const directory = resolve(selectedDirectory)
    const current = await this.load()
    const updated = updateDirectory(current, kind, directory)
    ensureDirectoriesDoNotOverlap(updated)
    await mkdir(dirname(this.settingsPath), { recursive: true })
    await writeFile(this.settingsPath, JSON.stringify(updated, null, 2), {
      encoding: "utf8",
      mode: 0o600,
    })
    return folderSettingsSchema.parse(updated)
  }
}

export class FolderSettingsConflictError extends Error {
  readonly name = "FolderSettingsConflictError"

  constructor() {
    super("待上传文件夹和归档文件夹不能相同或互相包含")
  }
}

class FolderSettingsStorageError extends Error {
  readonly name = "FolderSettingsStorageError"

  constructor(message: string, cause: Error) {
    super(message, { cause })
  }
}

function updateDirectory(
  current: FolderSettings,
  kind: FolderKind,
  directory: string,
): FolderSettings {
  switch (kind) {
    case "PENDING":
      return { ...current, pendingDirectory: directory }
    case "ARCHIVE":
      return { ...current, archiveDirectory: directory }
    default:
      return assertNever(kind)
  }
}

function ensureDirectoriesDoNotOverlap(settings: FolderSettings): void {
  const pending = settings.pendingDirectory
  const archive = settings.archiveDirectory
  if (pending === null || archive === null) return
  if (containsPath(pending, archive) || containsPath(archive, pending)) {
    throw new FolderSettingsConflictError()
  }
}

function containsPath(parent: string, child: string): boolean {
  const childRelativePath = relative(parent, child)
  return (
    childRelativePath.length === 0 ||
    (!childRelativePath.startsWith("..") && !isAbsolute(childRelativePath))
  )
}

function isNodeError(error: unknown, code: string): boolean {
  return error instanceof Error && "code" in error && error.code === code
}

function assertNever(value: never): never {
  throw new FolderSettingsStorageError(`未知文件夹类型：${String(value)}`, new TypeError())
}
