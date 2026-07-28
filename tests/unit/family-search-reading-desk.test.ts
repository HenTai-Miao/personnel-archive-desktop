import { flushPromises, mount } from "@vue/test-utils"
import ElementPlus from "element-plus"
import { createPinia } from "pinia"
import { afterEach, describe, expect, it, vi } from "vitest"
import { createMemoryHistory, createRouter } from "vue-router"
import { searchFamilyMembers } from "@/features/family-search/api"
import FamilySearchPage from "@/features/family-search/FamilySearchPage.vue"
import { familySearchItemSchema } from "@/features/family-search/schemas"

const archiveApiMocks = vi.hoisted(() => ({
  getPerson: vi.fn(),
  downloadPersonPhoto: vi.fn(),
  revealSensitiveValue: vi.fn(),
}))

vi.mock("@/features/family-search/api", () => ({
  searchFamilyMembers: vi.fn(),
}))

vi.mock("@/features/archive-view/api", () => archiveApiMocks)

afterEach(() => {
  vi.clearAllMocks()
})

const FIRST_MATCH = familySearchItemSchema.parse({
  personId: "7",
  personName: "人员甲",
  organization: "测试单位一",
  department: "档案部",
  position: "主管",
  titleOrSkill: "馆员",
  matchedMemberName: "王晓华",
  relationship: "母亲",
})

const SECOND_MATCH = familySearchItemSchema.parse({
  personId: "8",
  personName: "人员乙",
  organization: "测试单位二",
  department: "财务部",
  position: "职员",
  titleOrSkill: "会计师",
  matchedMemberName: "王晓华",
  relationship: "配偶",
})

describe("FamilySearchPage B-series match desk", () => {
  it("keeps every match and opens full detail only through the explicit action", async () => {
    vi.mocked(searchFamilyMembers).mockResolvedValue({
      content: [FIRST_MATCH, SECOND_MATCH],
      page: 0,
      size: 20,
      totalElements: 2,
      totalPages: 1,
    })
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/search", component: FamilySearchPage },
        { path: "/persons/:personId", name: "person-detail", component: { template: "<div />" } },
      ],
    })
    await router.push("/search")
    await router.isReady()
    const wrapper = mount(FamilySearchPage, {
      global: { plugins: [createPinia(), router, ElementPlus] },
    })

    await wrapper.get('[data-test="family-search-query"]').setValue("晓华")
    await wrapper.get('[data-test="family-search-submit"]').trigger("click")
    await flushPromises()

    expect(wrapper.find(".family-search-layout").exists()).toBe(true)
    expect(wrapper.find(".family-match-index").text()).toContain("2 条匹配")
    expect(wrapper.find(".family-match-index").text()).toContain("人员甲")
    expect(wrapper.find(".family-match-index").text()).toContain("人员乙")
    expect(wrapper.find(".family-match-sheet").text()).toContain("匹配成员")
    expect(wrapper.text()).toContain("每页 20 条")
    expect(archiveApiMocks.getPerson).not.toHaveBeenCalled()

    await wrapper.get('[data-test="view-matched-archive"]').trigger("click")
    await flushPromises()

    expect(router.currentRoute.value).toMatchObject({
      name: "person-detail",
      params: { personId: "7" },
      query: { member: "王晓华", relationship: "母亲" },
    })
    expect(archiveApiMocks.getPerson).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})
