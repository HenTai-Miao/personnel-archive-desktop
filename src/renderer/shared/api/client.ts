/**
 * Renderer 的统一 HTTP 边界：注入短期令牌、限制重试、解析 DTO，并归一化会话失效。
 */
import ky, { type Options } from "ky"
import { ZodError, type z } from "zod"
import { apiBaseUrl } from "./config"
import { ApiError, toApiError } from "./error"

// 访问令牌刻意只在内存中保存；需要持久化的刷新凭据交给 Electron safeStorage。
let accessToken: string | null = null
let expiredHandler: (() => Promise<void>) | null = null

const http = ky.create({
  prefixUrl: apiBaseUrl.replace(/\/$/, ""),
  timeout: 30_000,
  // 只自动重试幂等 GET，避免导入或覆盖决定因重放产生不可见副作用。
  retry: { limit: 1, methods: ["get"], statusCodes: [408, 502, 503, 504] },
  hooks: {
    beforeRequest: [
      (request) => {
        if (accessToken !== null) request.headers.set("Authorization", `Bearer ${accessToken}`)
      },
    ],
  },
})

export function setAccessToken(token: string | null): void {
  accessToken = token
}

export function onSessionExpired(handler: () => Promise<void>): void {
  expiredHandler = handler
}

export async function requestJson<T>(
  path: string,
  schema: z.ZodType<T>,
  options?: Options,
): Promise<T> {
  try {
    const payload: unknown = await http(path, options).json()
    // 后端响应是运行时外部输入，泛型 T 不能替代 Zod 校验。
    return schema.parse(payload)
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ApiError("NETWORK_RESPONSE_INVALID", "服务响应格式不正确", 502)
    }
    const apiError = await toApiError(error)
    if (apiError.status === 401 && expiredHandler !== null) await expiredHandler()
    throw apiError
  }
}

export async function requestVoid(path: string, options?: Options): Promise<void> {
  try {
    await http(path, options)
  } catch (error) {
    if (!(error instanceof Error)) throw error
    const apiError = await toApiError(error)
    if (apiError.status === 401 && expiredHandler !== null) await expiredHandler()
    throw apiError
  }
}

export async function requestArchive(path: string): Promise<Uint8Array<ArrayBuffer>> {
  return requestBinary(
    path,
    { method: "get", timeout: 60_000 },
    ["spreadsheetml", "octet-stream"],
    "服务未返回有效的 Excel 档案",
  )
}

export async function requestArchiveBundle(
  path: string,
  options: Options,
): Promise<Uint8Array<ArrayBuffer>> {
  return requestBinary(
    path,
    options,
    ["application/zip", "octet-stream"],
    "服务未返回有效的档案压缩包",
  )
}

export async function requestPhoto(path: string): Promise<Blob> {
  try {
    const response = await http(path, { method: "get" })
    const contentType = response.headers.get("content-type") ?? ""
    const mimeType = (["image/png", "image/jpeg"] as const).find((candidate) =>
      contentType.includes(candidate),
    )
    if (mimeType === undefined) {
      throw new ApiError("INVALID_PHOTO_RESPONSE", "服务未返回有效的档案照片", 502)
    }
    const bytes = new Uint8Array(await response.arrayBuffer())
    if (!hasImageSignature(bytes, mimeType)) {
      throw new ApiError("INVALID_PHOTO_RESPONSE", "服务未返回有效的档案照片", 502)
    }
    return new Blob([bytes], { type: mimeType })
  } catch (error) {
    if (!(error instanceof Error)) throw error
    const apiError = await toApiError(error)
    if (apiError.status === 401 && expiredHandler !== null) await expiredHandler()
    throw apiError
  }
}

async function requestBinary(
  path: string,
  options: Options,
  acceptedContentTypes: readonly string[],
  invalidMessage: string,
): Promise<Uint8Array<ArrayBuffer>> {
  try {
    const response = await http(path, options)
    // 错误 JSON 也可能带 200；保存前检查媒体类型和 ZIP 签名，避免把错误页伪装成文件。
    const contentType = response.headers.get("content-type") ?? ""
    if (!acceptedContentTypes.some((accepted) => contentType.includes(accepted))) {
      throw new ApiError("INVALID_ARCHIVE_RESPONSE", invalidMessage, 502)
    }
    const bytes = new Uint8Array(await response.arrayBuffer())
    if (!hasZipSignature(bytes)) {
      throw new ApiError("INVALID_ARCHIVE_RESPONSE", invalidMessage, 502)
    }
    return bytes
  } catch (error) {
    if (!(error instanceof Error)) throw error
    const apiError = await toApiError(error)
    if (apiError.status === 401 && expiredHandler !== null) await expiredHandler()
    throw apiError
  }
}

function hasZipSignature(bytes: Uint8Array): boolean {
  return (
    bytes.byteLength >= 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    bytes[2] === 0x03 &&
    bytes[3] === 0x04
  )
}

function hasImageSignature(bytes: Uint8Array, mimeType: "image/png" | "image/jpeg"): boolean {
  switch (mimeType) {
    case "image/png":
      return (
        bytes.byteLength >= 8 &&
        bytes[0] === 0x89 &&
        bytes[1] === 0x50 &&
        bytes[2] === 0x4e &&
        bytes[3] === 0x47 &&
        bytes[4] === 0x0d &&
        bytes[5] === 0x0a &&
        bytes[6] === 0x1a &&
        bytes[7] === 0x0a
      )
    case "image/jpeg":
      return bytes.byteLength >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
    default:
      return assertNeverMimeType(mimeType)
  }
}

function assertNeverMimeType(value: never): never {
  throw new ApiError("INVALID_PHOTO_RESPONSE", `不支持的档案照片类型：${String(value)}`, 502)
}
