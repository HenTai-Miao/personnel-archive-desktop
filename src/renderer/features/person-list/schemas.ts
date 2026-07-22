/** 人员列表项及分页结构的运行时响应契约。 */
import { z } from "zod"
import { personIdSchema } from "@/shared/api/schemas"

export const personListItemSchema = z
  .object({
    id: personIdSchema,
    employeeNo: z.string(),
    name: z.string(),
    organization: z.string(),
    department: z.string(),
    position: z.string(),
    titleOrSkill: z.string(),
    updatedAt: z.iso.datetime(),
  })
  .strict()

export const personListPageSchema = z
  .object({
    content: z.array(personListItemSchema),
    page: z.number().int().nonnegative(),
    size: z.number().int().positive(),
    totalElements: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
  })
  .strict()

export type PersonListItem = Readonly<z.infer<typeof personListItemSchema>>
