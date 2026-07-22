/**
 * 导出档案的临时文件生命周期：随机写入、交给系统关联程序打开，并在后续启动时过期清理。
 */
import { randomUUID } from "node:crypto"
import { mkdir, readdir, unlink, writeFile } from "node:fs/promises"
import { basename, join } from "node:path"
import { app, shell } from "electron"
import { type OpenArchiveResult, openArchiveRequestSchema } from "../shared/ipc-contract"

const RETENTION_MS = 24 * 60 * 60 * 1000

function tempDirectory(): string {
  return join(app.getPath("temp"), "personnel-archive-assistant")
}

export async function cleanupExpiredWorkbooks(now = Date.now()): Promise<void> {
  try {
    const directory = tempDirectory()
    await mkdir(directory, { recursive: true })
    const entries = await readdir(directory, { withFileTypes: true })
    await Promise.all(
      entries
        .filter((entry) => entry.isFile() && entry.name.endsWith(".xlsx"))
        .map(async (entry) => cleanupFile(join(directory, entry.name), now)),
    )
  } catch (error) {
    // 清理失败不能阻止客户端启动；文件级异常仍由 cleanupFile 尽量精确处理。
    if (error instanceof Error) return
    throw error
  }
}

async function cleanupFile(path: string, now: number): Promise<void> {
  try {
    const stats = await import("node:fs/promises").then(({ stat }) => stat(path))
    if (now - stats.mtimeMs > RETENTION_MS) await unlink(path)
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return
    throw error
  }
}

export async function writeAndOpenWorkbook(input: unknown): Promise<OpenArchiveResult> {
  // suggestedName 来自 renderer，必须先通过共享 schema，再用 basename 消除路径含义。
  const request = openArchiveRequestSchema.parse(input)
  const directory = tempDirectory()
  await mkdir(directory, { recursive: true })
  const safeName = basename(request.suggestedName)
  // UUID 加 wx 原子创建保证同名人员的多次导出互不覆盖。
  const path = join(directory, `${randomUUID()}-${safeName}`)
  await writeFile(path, request.bytes, { flag: "wx" })
  const errorMessage = await shell.openPath(path)
  if (errorMessage.length > 0) {
    return { opened: false, message: "已生成档案，但未找到可打开 .xlsx 的桌面应用" }
  }
  return { opened: true, message: "档案已在桌面应用中打开" }
}
