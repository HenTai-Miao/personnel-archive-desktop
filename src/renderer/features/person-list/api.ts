/** 有效人员档案列表 API，负责筛选/分页参数和响应校验。 */
import { z } from "zod"
import { requestArchiveBundle, requestJson, requestVoid } from "@/shared/api/client"
import { personIdSchema } from "@/shared/api/schemas"
import { personListPageSchema } from "./schemas"

const personListQuerySchema = z
  .object({
    name: z.string().trim().max(128),
    employeeNo: z.string().trim().max(64),
    department: z.string().trim().max(255),
    page: z.number().int().nonnegative(),
    size: z.number().int().min(1).max(100),
  })
  .strict()

const batchExportRequestSchema = z
  .object({
    personIds: z
      .array(personIdSchema)
      .min(1)
      .max(100)
      .refine((ids) => new Set(ids).size === ids.length),
  })
  .strict()

const personDeletionRequestSchema = z
  .object({ reason: z.string().trim().min(1).max(10_000) })
  .strict()

export type PersonListQuery = Readonly<z.infer<typeof personListQuerySchema>>

export function buildPersonListPath(input: unknown): string {
  const query = personListQuerySchema.parse(input)
  const params = new URLSearchParams({ page: String(query.page), size: String(query.size) })
  if (query.name.length > 0) params.set("name", query.name)
  if (query.employeeNo.length > 0) params.set("employeeNo", query.employeeNo)
  if (query.department.length > 0) params.set("department", query.department)
  return `persons?${params.toString()}`
}

export function fetchPersons(input: unknown) {
  return requestJson(buildPersonListPath(input), personListPageSchema)
}

export function buildBatchExportBody(input: unknown) {
  return batchExportRequestSchema.parse({ personIds: input })
}

export function downloadPersonArchives(input: unknown) {
  const request = buildBatchExportBody(input)
  return requestArchiveBundle("persons/exports", {
    method: "post",
    json: request,
    timeout: 120_000,
  })
}

export function buildPersonDeletionBody(input: unknown) {
  return personDeletionRequestSchema.parse({ reason: input })
}

export function deletePerson(personId: unknown, reason: unknown): Promise<void> {
  const id = personIdSchema.parse(personId)
  return requestVoid(`persons/${id}/deletion`, {
    method: "post",
    json: buildPersonDeletionBody(reason),
  })
}
