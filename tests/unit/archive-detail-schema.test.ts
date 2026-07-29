/** 完整档案响应契约测试：保证详情分区齐全，并拒绝旧摘要结构或额外字段。 */
import { describe, expect, it } from "vitest"
import { personDetailSchema, sensitiveValueSchema } from "@/features/archive-view/schemas"

const completeDetail = {
  id: "9007199254740993",
  employeeNo: "E-001",
  name: "测试甲",
  identityCardMasked: "1234***********678",
  personal: {
    gender: "女",
    birthDate: "2000.01",
    nation: "汉族",
    nativePlace: "湖南长沙",
    birthPlace: "湖南长沙",
    politicalStatus: "中共党员",
    politicalJoinDate: "2021.07",
    maritalStatus: "已婚",
    healthStatus: "健康",
    mailingAddress: "测试地址",
    postalCode: "410000",
    phoneNumberMasked: "1380****000",
  },
  employment: {
    organization: "测试单位",
    department: "测试部门",
    workStartDate: "2020.01",
    dispatchedToBiddingCompanyDate: "2021.01",
    position: "测试职务",
    titleOrSkill: "测试技能",
    titleOrSkillAcquiredDate: "2022.01",
  },
  education: {
    fullTime: {
      institutionName: "全日制大学",
      departmentAndMajor: "档案学",
      educationLevel: "本科",
      degreeName: "学士",
    },
    inService: {
      institutionName: "",
      departmentAndMajor: "",
      educationLevel: "",
      degreeName: "",
    },
  },
  mainEducation: [{ sortOrder: 1, leftText: "2020.09-2024.06", rightText: "示例大学" }],
  workExperiences: [{ sortOrder: 1, leftText: "2024.07-至今", rightText: "测试单位" }],
  rewardsPunishments: [{ sortOrder: 1, leftText: "2025.01", rightText: "测试奖励" }],
  familyMembers: [
    {
      name: "测试乙",
      relationship: "子女",
      birthDate: "2000-07-23",
      age: "25",
      politicalStatus: "群众",
      organizationAndPosition: "测试单位",
    },
  ],
  declaration: { signer: "测试甲", date: "2026-07-22" },
  photo: {
    mimeType: "image/png",
    originalFilename: "fixture.png",
    byteSize: 128,
    widthPixels: 3,
    heightPixels: 4,
  },
  archive: { templateVersion: "V1", snapshotVersion: 2, updatedAt: "2026-07-22T03:00:00Z" },
} as const

describe("personDetailSchema", () => {
  it("parses all imported sections without converting bigint identifiers", () => {
    // Given / When
    const detail = personDetailSchema.parse(completeDetail)

    // Then
    expect(detail.id).toBe("9007199254740993")
    expect(detail.education.fullTime.institutionName).toBe("全日制大学")
    expect(detail.familyMembers[0]?.politicalStatus).toBe("群众")
    expect(detail.familyMembers[0]?.age).toBe("25")
    expect(detail.photo?.mimeType).toBe("image/png")
  })

  it("rejects a recalculated numeric age instead of accepting the source string", () => {
    const changedAge = {
      ...completeDetail,
      familyMembers: [{ ...completeDetail.familyMembers[0], age: 26 }],
    }

    expect(() => personDetailSchema.parse(changedAge)).toThrow()
  })

  it("rejects a response when an imported section is missing", () => {
    // Given
    const { rewardsPunishments: omitted, ...incompleteDetail } = completeDetail
    expect(omitted).toHaveLength(1)

    // When / Then
    expect(() => personDetailSchema.parse(incompleteDetail)).toThrow()
  })

  it("accepts a detail response whose optional identity cells were blank", () => {
    // Given
    const blankIdentity = {
      ...completeDetail,
      employeeNo: "",
      name: "",
      identityCardMasked: "",
    }

    // When
    const detail = personDetailSchema.parse(blankIdentity)

    // Then
    expect(detail.name).toBe("")
  })

  it("rejects a base detail response that exposes the full phone number", () => {
    // Given
    const { phoneNumberMasked: omitted, ...personal } = completeDetail.personal
    expect(omitted).toBe("1380****000")
    const unsafeDetail = {
      ...completeDetail,
      personal: { ...personal, phoneNumber: "13800138000" },
    }

    // When / Then
    expect(() => personDetailSchema.parse(unsafeDetail)).toThrow()
  })

  it("parses one explicitly requested sensitive value", () => {
    // Given / When
    const result = sensitiveValueSchema.parse({ value: "123456789012345678" })

    // Then
    expect(result.value).toBe("123456789012345678")
  })
})
