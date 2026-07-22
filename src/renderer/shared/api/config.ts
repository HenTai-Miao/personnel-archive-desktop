/** API 根地址配置：集中校验 URL，并强制所有业务请求落在版本化的 /api/v1。 */
import { z } from "zod"

const defaultApiBaseUrl = "http://127.0.0.1:8080/api/v1"
const apiBaseUrlSchema = z
  .url()
  .refine((value) => new URL(value).pathname.replace(/\/$/, "") === "/api/v1")

export const apiBaseUrl = apiBaseUrlSchema.parse(
  import.meta.env["VITE_API_BASE_URL"] ?? defaultApiBaseUrl,
)
