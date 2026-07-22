/** 档案详情页测试：锁定 Excel 已导入字段的完整分区展示和照片生命周期。 */
import { flushPromises, mount } from "@vue/test-utils"
import ElementPlus from "element-plus"
import { afterEach, describe, expect, it, vi } from "vitest"
import { createMemoryHistory, createRouter } from "vue-router"
import ArchiveDetailPage from "@/features/archive-view/ArchiveDetailPage.vue"

const apiMocks = vi.hoisted(() => ({
  getPerson: vi.fn(),
  downloadPersonPhoto: vi.fn(),
  revealSensitiveValue: vi.fn(),
}))

vi.mock("@/features/archive-view/api", () => apiMocks)

vi.mock("@/features/archive-view/open-archive", () => ({
  downloadAndOpenArchive: vi.fn(),
}))

afterEach(() => {
  vi.restoreAllMocks()
})

describe("ArchiveDetailPage", () => {
  it("shows every imported workbook section and the stored photo", async () => {
    // Given
    apiMocks.getPerson.mockResolvedValue({
      id: "7",
      employeeNo: "E-001",
      name: "测试甲",
      identityCardMasked: "1234***********012",
      personal: {
        gender: "女",
        birthDate: "2000-01-01",
        nation: "汉族",
        nativePlace: "湖南长沙",
        birthPlace: "湖南长沙",
        politicalStatus: "中共党员",
        politicalJoinDate: "2021-07-01",
        maritalStatus: "已婚",
        healthStatus: "健康",
        mailingAddress: "测试地址",
        postalCode: "410000",
        phoneNumberMasked: "0000*002",
      },
      employment: {
        organization: "测试单位",
        department: "测试部门",
        workStartDate: "2020-01-01",
        dispatchedToBiddingCompanyDate: "2021-01-01",
        position: "测试职务",
        titleOrSkill: "测试技能",
        titleOrSkillAcquiredDate: "2022-01-01",
      },
      education: {
        fullTime: {
          institutionName: "全日制大学",
          departmentAndMajor: "档案学",
          educationLevel: "本科",
          degreeName: "学士",
        },
        inService: {
          institutionName: "在职大学",
          departmentAndMajor: "管理学",
          educationLevel: "研究生",
          degreeName: "硕士",
        },
      },
      mainEducation: [{ sortOrder: 1, leftText: "2020.09-2024.06", rightText: "示例大学" }],
      workExperiences: [{ sortOrder: 1, leftText: "2024.07-至今", rightText: "覆盖版本" }],
      rewardsPunishments: [{ sortOrder: 1, leftText: "2025.01", rightText: "测试奖励" }],
      familyMembers: [
        {
          name: "测试乙",
          relationship: "测试称谓",
          birthDate: "2000-07-23",
          age: 25,
          politicalStatus: "测试面貌",
          organizationAndPosition: "测试单位及职务",
        },
      ],
      declaration: { signer: "测试甲", date: "2026-07-22" },
      photo: {
        mimeType: "image/png",
        originalFilename: "fixture-photo.png",
        byteSize: 128,
        widthPixels: 3,
        heightPixels: 4,
      },
      archive: {
        templateVersion: "V1",
        snapshotVersion: 2,
        updatedAt: "2026-07-22T03:00:00Z",
      },
    })
    apiMocks.downloadPersonPhoto.mockResolvedValue(
      new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" }),
    )
    const createObjectUrl = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:person-photo")
    const revokeObjectUrl = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined)
    const scrollIntoView = vi.fn()
    HTMLElement.prototype.scrollIntoView = scrollIntoView
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/persons", component: { template: "<div />" } },
        { path: "/persons/:personId", name: "person-detail", component: ArchiveDetailPage },
      ],
    })
    await router.push({
      path: "/persons/7",
      query: { member: "测试乙", relationship: "测试称谓" },
    })
    await router.isReady()

    // When
    const wrapper = mount(ArchiveDetailPage, {
      attachTo: document.body,
      global: { plugins: [router, ElementPlus] },
    })
    await flushPromises()

    // Then
    expect(wrapper.text()).toContain("任职信息")
    expect(wrapper.text()).toContain("2021-01-01")
    expect(wrapper.text()).toContain("全日制教育")
    expect(wrapper.text()).toContain("全日制大学")
    expect(wrapper.text()).toContain("主要学历")
    expect(wrapper.text()).toContain("示例大学")
    expect(wrapper.text()).toContain("工作经历")
    expect(wrapper.text()).toContain("覆盖版本")
    expect(wrapper.text()).toContain("奖惩情况")
    expect(wrapper.text()).toContain("测试奖励")
    expect(wrapper.text()).toContain("测试面貌")
    expect(wrapper.text()).toContain("申报信息")
    expect(wrapper.text()).toContain("详情导航")
    expect(wrapper.text()).not.toContain("FULL-TIME")
    expect(wrapper.text()).not.toContain("IN-SERVICE")
    expect(wrapper.text()).not.toContain("DECLARATION")
    expect(wrapper.get('img[alt="测试甲的档案照片"]').attributes("src")).toBe("blob:person-photo")
    expect(apiMocks.downloadPersonPhoto).toHaveBeenCalledWith("7")
    expect(createObjectUrl).toHaveBeenCalledOnce()
    expect(wrapper.get(".family-member-row").classes()).toContain("is-search-match")
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "center" })

    wrapper.unmount()
    expect(revokeObjectUrl).toHaveBeenCalledWith("blob:person-photo")
  })
})
