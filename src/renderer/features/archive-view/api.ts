/** 档案查看 API：读取脱敏详情，或下载服务端按模板生成的 XLSX 字节。 */
import { requestArchive, requestJson, requestPhoto } from "@/shared/api/client"
import type { PersonId } from "@/shared/api/schemas"
import { personDetailSchema } from "./schemas"

export function getPerson(personId: PersonId) {
  return requestJson(`persons/${personId}`, personDetailSchema)
}

export function downloadArchive(personId: PersonId) {
  return requestArchive(`persons/${personId}/archive`)
}

export function downloadPersonPhoto(personId: PersonId) {
  return requestPhoto(`persons/${personId}/photo`)
}
