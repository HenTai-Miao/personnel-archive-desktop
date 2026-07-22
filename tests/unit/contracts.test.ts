/** HTTP 契约测试：验证共享 Zod DTO 接受约定数据并拒绝结构漂移。 */
import { describe, expect, it } from "vitest"
import { router } from "@/app/router"
import { importBatchSchema } from "@/features/archive-import/schemas"
import { buildFamilySearchPath } from "@/features/family-search/api"
import { familySearchPageSchema } from "@/features/family-search/schemas"
import { buildBatchExportBody, buildPersonListPath } from "@/features/person-list/api"
import { personListPageSchema } from "@/features/person-list/schemas"
import { apiErrorSchema } from "@/shared/api/schemas"

describe("API response contracts", () => {
  it("registers the active archive list as the authenticated landing page", () => {
    const routeNames = router.getRoutes().map((route) => route.name)
    expect(routeNames).toContain("person-list")
    expect(router.resolve("/persons").name).toBe("person-list")
  })

  it("encodes person filters and parses string identifiers", () => {
    const path = buildPersonListPath({
      name: " 测试甲 ",
      employeeNo: "E/001",
      department: "档案 管理部",
      page: 2,
      size: 20,
    })
    expect(path).toBe(
      "persons?page=2&size=20&name=%E6%B5%8B%E8%AF%95%E7%94%B2&employeeNo=E%2F001&department=%E6%A1%A3%E6%A1%88+%E7%AE%A1%E7%90%86%E9%83%A8",
    )
    const page = personListPageSchema.parse({
      content: [
        {
          id: "9007199254740993",
          employeeNo: "E/001",
          name: "测试甲",
          organization: "示例单位",
          department: "档案管理部",
          position: "职员",
          titleOrSkill: "",
          updatedAt: "2026-07-22T03:00:00Z",
        },
      ],
      page: 0,
      size: 20,
      totalElements: 1,
      totalPages: 1,
    })
    expect(page.content[0]?.id).toBe("9007199254740993")
  })

  it("keeps repeated family member matches", () => {
    const response = familySearchPageSchema.parse({
      content: [
        {
          personId: "101",
          personName: "测试甲",
          organization: "示例单位",
          department: "一部",
          position: "职员",
          titleOrSkill: "",
          matchedMemberName: "示例成员",
          relationship: "父亲",
        },
        {
          personId: "102",
          personName: "测试乙",
          organization: "示例单位",
          department: "二部",
          position: "职员",
          titleOrSkill: "",
          matchedMemberName: "示例成员",
          relationship: "配偶",
        },
      ],
      page: 0,
      size: 20,
      totalElements: 2,
      totalPages: 1,
    })
    expect(response.content).toHaveLength(2)
  })

  it("uses the backend zero-based page contract", () => {
    expect(buildFamilySearchPath({ name: "示例", page: 0, size: 20 })).toContain("page=0")
    expect(buildFamilySearchPath({ name: "示例", page: 1, size: 20 })).toContain("page=1")
  })

  it("keeps large person identifiers as distinct strings in batch exports", () => {
    // Given
    const personIds = ["9007199254740993", "9007199254740995"]

    // When
    const body = buildBatchExportBody(personIds)

    // Then
    expect(body).toEqual({ personIds })
    expect(() => buildBatchExportBody([personIds[0], personIds[0]])).toThrow()
  })

  it("parses a mixed import batch without collapsing outcomes", () => {
    const batch = importBatchSchema.parse({
      batchId: "batch-1",
      items: [
        {
          itemId: "1",
          fileName: "档案一.xlsx",
          status: "IMPORTED",
          code: "IMPORTED",
          message: "导入成功",
        },
        {
          itemId: "2",
          fileName: "档案二.xlsx",
          status: "FAILED",
          code: "TEMPLATE_INVALID",
          message: "模板不匹配",
        },
      ],
    })
    expect(batch.items.map((item) => item.status)).toEqual(["IMPORTED", "FAILED"])
  })

  it("accepts a duplicate decision when employee numbers were left blank", () => {
    // Given / When
    const batch = importBatchSchema.parse({
      batchId: "batch-blank-number",
      items: [
        {
          itemId: "3",
          fileName: "无编号档案.xlsx",
          status: "PENDING_DECISION",
          code: "DUPLICATE_REQUIRES_DECISION",
          message: "档案已存在，请选择覆盖或跳过",
          duplicate: {
            personName: "测试甲",
            identityCardLastFour: "0012",
            existingEmployeeNo: "",
            incomingEmployeeNo: "",
            existingUpdatedAt: "2026-07-22T03:00:00Z",
          },
        },
      ],
    })

    // Then
    expect(batch.items[0]?.status).toBe("PENDING_DECISION")
  })

  it("accepts active archive list rows whose optional identity fields are blank", () => {
    // Given / When
    const page = personListPageSchema.parse({
      content: [
        {
          id: "103",
          employeeNo: "",
          name: "",
          organization: "",
          department: "",
          position: "",
          titleOrSkill: "",
          updatedAt: "2026-07-22T03:00:00Z",
        },
      ],
      page: 0,
      size: 20,
      totalElements: 1,
      totalPages: 1,
    })

    // Then
    expect(page.content[0]?.name).toBe("")
  })

  it("accepts a family match belonging to an archive with no person name", () => {
    // Given / When
    const page = familySearchPageSchema.parse({
      content: [
        {
          personId: "104",
          personName: "",
          organization: "",
          department: "",
          position: "",
          titleOrSkill: "",
          matchedMemberName: "示例成员",
          relationship: "",
        },
      ],
      page: 0,
      size: 20,
      totalElements: 1,
      totalPages: 1,
    })

    // Then
    expect(page.content[0]?.personName).toBe("")
  })

  it("accepts the backend error envelope without weakening strict parsing", () => {
    const error = apiErrorSchema.parse({
      code: "STALE_IMPORT_DECISION",
      message: "档案状态已变化",
      timestamp: "2026-07-22T02:00:00Z",
      details: null,
    })
    expect(error.code).toBe("STALE_IMPORT_DECISION")
  })
})
