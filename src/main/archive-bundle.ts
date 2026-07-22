/** 批量导出保存边界：只允许用户通过系统对话框保存经过签名校验的 ZIP。 */
import { writeFile } from "node:fs/promises"
import { basename, extname } from "node:path"
import { type BrowserWindow, dialog } from "electron"
import {
  type SaveArchiveBundleResult,
  saveArchiveBundleRequestSchema,
} from "../shared/ipc-contract"

export async function saveArchiveBundle(
  window: BrowserWindow,
  input: unknown,
): Promise<SaveArchiveBundleResult> {
  const request = saveArchiveBundleRequestSchema.parse(input)
  const selection = await dialog.showSaveDialog(window, {
    title: "保存人员档案压缩包",
    defaultPath: request.suggestedName,
    filters: [{ name: "ZIP 压缩包", extensions: ["zip"] }],
    properties: ["createDirectory", "showOverwriteConfirmation"],
  })
  if (selection.canceled || selection.filePath === undefined) return { status: "CANCELED" }
  // 文件路径只能来自主进程系统对话框；renderer 无法指定任意写入位置。
  const targetPath =
    extname(selection.filePath).toLowerCase() === ".zip"
      ? selection.filePath
      : `${selection.filePath}.zip`
  await writeFile(targetPath, request.bytes)
  return { status: "SAVED", fileName: basename(targetPath) }
}
