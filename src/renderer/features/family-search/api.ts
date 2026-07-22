/** 家庭成员姓名模糊搜索 API，负责查询参数编码和响应校验。 */
import { z } from "zod"
import { requestJson } from "@/shared/api/client"
import { familySearchPageSchema } from "./schemas"

const querySchema = z
  .object({
    name: z.string().trim().min(1).max(128),
    page: z.number().int().nonnegative(),
    size: z.number().int().min(1).max(100),
  })
  .strict()

export async function searchFamilyMembers(input: unknown) {
  const query = querySchema.parse(input)
  return requestJson(buildFamilySearchPath(query), familySearchPageSchema)
}

export function buildFamilySearchPath(query: z.infer<typeof querySchema>): string {
  const params = new URLSearchParams({
    name: query.name,
    page: String(query.page),
    size: String(query.size),
  })
  return `family-members/search?${params.toString()}`
}
