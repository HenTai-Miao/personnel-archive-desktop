/** 认证 API：登录、刷新和退出请求的唯一前端入口。 */
import { z } from "zod"
import { requestJson, requestVoid } from "@/shared/api/client"
import { authTokensSchema } from "@/shared/api/schemas"

const loginRequestSchema = z
  .object({
    username: z.string().trim().min(1).max(100),
    password: z.string().min(1).max(256),
  })
  .strict()

const refreshRequestSchema = z.object({ refreshToken: z.string().min(1) }).strict()

export async function login(input: unknown) {
  const payload = loginRequestSchema.parse(input)
  return requestJson("auth/login", authTokensSchema, { method: "post", json: payload })
}

export async function refresh(refreshToken: string) {
  const payload = refreshRequestSchema.parse({ refreshToken })
  return requestJson("auth/refresh", authTokensSchema, { method: "post", json: payload })
}

export async function logout(refreshToken: string): Promise<void> {
  const payload = refreshRequestSchema.parse({ refreshToken })
  await requestVoid("auth/logout", { method: "post", json: payload })
}
