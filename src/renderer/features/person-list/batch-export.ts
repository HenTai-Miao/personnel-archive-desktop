/** 档案包下载与保存编排：服务端负责重建，Electron main 负责选择最终落盘位置。 */
import type { SaveArchiveBundleResult } from "@shared/ipc-contract"
import { ApiError } from "@/shared/api/error"
import type { PersonId } from "@/shared/api/schemas"
import { downloadPersonArchives } from "./api"

export async function downloadAndSavePersonArchives(
  personIds: readonly PersonId[],
): Promise<SaveArchiveBundleResult> {
  const bytes = await downloadPersonArchives(personIds)
  try {
    return await window.personnelArchive.saveArchiveBundle({
      suggestedName: suggestedBundleName(new Date()),
      bytes,
    })
  } catch (error) {
    if (!(error instanceof Error)) throw error
    throw new ApiError("ARCHIVE_BUNDLE_SAVE_FAILED", "无法保存档案压缩包，请更换位置后重试", 0)
  }
}

function suggestedBundleName(now: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0")
  const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  return `人员档案批量导出-${timestamp}.zip`
}
