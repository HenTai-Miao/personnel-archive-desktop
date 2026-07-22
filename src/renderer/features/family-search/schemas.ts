/** 家庭成员搜索结果及分页元数据的运行时响应契约。 */
import { z } from "zod"
import { personIdSchema } from "@/shared/api/schemas"

export const familySearchItemSchema = z
  .object({
    personId: personIdSchema,
    personName: z.string(),
    organization: z.string(),
    department: z.string(),
    position: z.string(),
    titleOrSkill: z.string(),
    matchedMemberName: z.string().min(1),
    relationship: z.string(),
  })
  .strict()

export const familySearchPageSchema = z
  .object({
    content: z.array(familySearchItemSchema),
    page: z.number().int().nonnegative(),
    size: z.number().int().positive(),
    totalElements: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
  })
  .strict()

export type FamilySearchItem = z.infer<typeof familySearchItemSchema>
