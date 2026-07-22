/** 导入决定测试：保证仅稳定过期错误码触发重新预检提示。 */
import { describe, expect, it } from "vitest"
import { isStaleImportDecision } from "@/features/archive-import/decision-policy"
import { ApiError } from "@/shared/api/error"

describe("stale import decision", () => {
  it("recognizes the stable backend code", () => {
    expect(isStaleImportDecision(new ApiError("STALE_IMPORT_DECISION", "已变化", 409))).toBe(true)
  })

  it("does not treat other conflicts as stale decisions", () => {
    expect(isStaleImportDecision(new ApiError("EMPLOYEE_NO_CONFLICT", "编号冲突", 409))).toBe(false)
  })
})
