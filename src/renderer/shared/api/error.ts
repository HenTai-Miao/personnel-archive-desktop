/**
 * API 错误适配层：界面只依赖稳定错误码，服务端 message 仅作为未知码的安全后备。
 */
import { HTTPError } from "ky"
import { apiErrorSchema } from "./schemas"

const ERROR_MESSAGES: Readonly<Record<string, string>> = {
  INVALID_CREDENTIALS: "用户名或密码不正确",
  SESSION_EXPIRED: "登录已过期，请重新登录",
  UNAUTHORIZED: "登录已过期，请重新登录",
  FORBIDDEN: "当前账号没有执行此操作的权限",
  NOT_FOUND: "档案不存在或已删除",
  VALIDATION_ERROR: "提交的数据未通过校验",
  TEMPLATE_INVALID: "工作簿格式与系统模板不一致",
  IDENTITY_CARD_CONFLICT: "身份证号已存在，但姓名不一致，无法导入",
  EMPLOYEE_NO_CONFLICT: "人员编号已归属于其他人员，无法导入",
  STALE_IMPORT_DECISION: "档案已发生变化，请重新预检并确认处理方式",
  FILE_TOO_LARGE: "文件超过允许大小",
  BATCH_EXPORT_TOO_LARGE: "所选档案生成后的压缩包过大，请减少选择数量",
  UNSUPPORTED_FILE_TYPE: "仅支持 .xlsx 工作簿",
} as const

export class ApiError extends Error {
  readonly name = "ApiError"
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
}

export async function toApiError(error: unknown): Promise<ApiError> {
  if (!(error instanceof HTTPError)) throw error
  // 无法解析的错误响应不能直接显示原始正文，避免泄露代理页或服务端细节。
  const payload = await readErrorPayload(error.response)
  const parsed = apiErrorSchema.safeParse(payload)
  if (!parsed.success) {
    return new ApiError("NETWORK_RESPONSE_INVALID", "服务响应格式不正确", error.response.status)
  }
  return new ApiError(
    parsed.data.code,
    ERROR_MESSAGES[parsed.data.code] ?? parsed.data.message,
    error.response.status,
  )
}

async function readErrorPayload(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch (error) {
    if (error instanceof Error) return null
    throw error
  }
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return "无法连接人员档案数据服务，请检查网络后重试"
  return "发生未知错误，请重试"
}
