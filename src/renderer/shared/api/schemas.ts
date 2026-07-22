/** 跨功能共享的 API 标识、用户和错误响应运行时契约。 */
import { z } from "zod"

export const personIdSchema = z.string().min(1).brand("PersonId")
export const importItemIdSchema = z.string().min(1).brand("ImportItemId")
export const importBatchIdSchema = z.string().min(1).brand("ImportBatchId")

export const roleSchema = z.enum(["ADMIN", "ARCHIVE_EDITOR", "VIEWER"])
export const userSchema = z
  .object({
    id: z.string().min(1),
    username: z.string().min(1),
    displayName: z.string().min(1),
    roles: z.array(roleSchema),
  })
  .strict()

export const authTokensSchema = z
  .object({
    accessToken: z.string().min(1),
    refreshToken: z.string().min(1),
    expiresIn: z.number().int().positive(),
    user: userSchema,
  })
  .strict()

export const apiErrorSchema = z
  .object({
    code: z.string().min(1),
    message: z.string().min(1),
    timestamp: z.iso.datetime(),
    details: z.unknown().optional(),
  })
  .strict()

export type AuthTokens = z.infer<typeof authTokensSchema>
export type User = z.infer<typeof userSchema>
export type PersonId = z.infer<typeof personIdSchema>
export type ImportItemId = z.infer<typeof importItemIdSchema>
export type ImportBatchId = z.infer<typeof importBatchIdSchema>
