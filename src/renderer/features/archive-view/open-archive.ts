/**
 * 档案打开流程：下载服务端重建的 XLSX，再交给受信 main 进程写临时文件并调用系统应用。
 */
import type { PersonId } from "@/shared/api/schemas"
import { downloadArchive } from "./api"

function safeWorkbookName(personName: string): string {
  // Windows 保留字符不能进入建议文件名；main 进程仍会再次校验并取 basename。
  const sanitized = personName.replace(/[\\/:*?"<>|]/g, "_").slice(0, 80)
  return `${sanitized || "人员档案"}-个人基本情况表.xlsx`
}

export async function downloadAndOpenArchive(
  personId: PersonId,
  personName: string,
): Promise<string> {
  const bytes = await downloadArchive(personId)
  const result = await window.personnelArchive.openArchive({
    suggestedName: safeWorkbookName(personName),
    bytes,
  })
  return result.message
}
