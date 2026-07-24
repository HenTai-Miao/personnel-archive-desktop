/** 档案删除 API 契约测试：限制原因长度并锁定 POST 路径与 JSON 请求体。 */
import { afterEach, describe, expect, it, vi } from "vitest"
import { buildPersonDeletionBody, deletePerson } from "@/features/person-list/api"

const clientMocks = vi.hoisted(() => ({
  requestVoid: vi.fn(),
}))

vi.mock("@/shared/api/client", () => ({
  requestArchiveBundle: vi.fn(),
  requestJson: vi.fn(),
  requestVoid: clientMocks.requestVoid,
}))

afterEach(() => {
  vi.clearAllMocks()
})

describe("person deletion API", () => {
  it("trims and validates the required deletion reason", () => {
    expect(buildPersonDeletionBody("  误导入\n")).toEqual({ reason: "误导入" })
    expect(() => buildPersonDeletionBody(" \n\t")).toThrow()
    expect(() => buildPersonDeletionBody("原".repeat(10_001))).toThrow()
  })

  it("posts the deletion reason for a validated person id", async () => {
    clientMocks.requestVoid.mockResolvedValue(undefined)

    await deletePerson("9007199254740993", "误导入")

    expect(clientMocks.requestVoid).toHaveBeenCalledWith("persons/9007199254740993/deletion", {
      method: "post",
      json: { reason: "误导入" },
    })
  })
})
