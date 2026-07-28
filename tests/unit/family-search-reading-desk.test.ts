import { flushPromises, mount } from "@vue/test-utils"
import ElementPlus from "element-plus"
import { createPinia } from "pinia"
import { afterEach, describe, expect, it, vi } from "vitest"
import { defineComponent, h } from "vue"
import { createMemoryHistory, createRouter } from "vue-router"
import { searchFamilyMembers } from "@/features/family-search/api"
import FamilySearchPage from "@/features/family-search/FamilySearchPage.vue"
import { familySearchItemSchema } from "@/features/family-search/schemas"

const archiveApiMocks = vi.hoisted(() => ({
  getPerson: vi.fn(),
  downloadPersonPhoto: vi.fn(),
  revealSensitiveValue: vi.fn(),
}))

const tableStub = defineComponent({
  name: "ElTable",
  props: { data: { type: Array, required: true } },
  setup(props, { attrs, slots }) {
    return () => {
      const columns = slots["default"]?.() ?? []
      return h(
        "div",
        attrs,
        props.data.map((row) =>
          h(
            "div",
            columns.map((column) => {
              const children = column.children
              const defaultSlot =
                typeof children === "object" && children !== null && !Array.isArray(children)
                  ? children["default"]
                  : undefined
              if (typeof defaultSlot === "function") return h("div", defaultSlot({ row }))

              const prop = column.props?.["prop"]
              return h(
                "div",
                typeof prop === "string"
                  ? String((row as Record<string, unknown>)[prop] ?? "")
                  : "",
              )
            }),
          ),
        ),
      )
    }
  },
})

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

describe("FamilySearchPage B-series results ledger", () => {
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
      global: {
        plugins: [createPinia(), router, ElementPlus],
        stubs: { ElTable: tableStub, ElTableColumn: true },
      },
    })

    await wrapper.get('[data-test="family-search-query"]').setValue("晓华")
    await wrapper.find(".family-search-paper").trigger("submit")
    await flushPromises()

    expect(wrapper.find(".family-search-paper").exists()).toBe(true)
    expect(wrapper.find(".family-result-sheet").exists()).toBe(true)
    expect(wrapper.find(".family-search-layout").exists()).toBe(false)
    expect(wrapper.find(".family-match-index").exists()).toBe(false)
    expect(wrapper.find(".family-match-sheet").exists()).toBe(false)
    expect(wrapper.get('[data-test="family-search-results"]').text()).toContain("王晓华")
    expect(wrapper.get('[data-test="family-search-results"]').text()).toContain("人员甲")
    expect(wrapper.get('[data-test="family-search-results"]').text()).toContain("人员乙")
    expect(wrapper.get('[data-test="family-search-results"]').text()).toContain("测试单位一")
    expect(wrapper.get('[data-test="family-search-results"]').text()).toContain("财务部")
    expect(wrapper.text()).toContain("2 条匹配记录")
    expect(wrapper.text()).toContain("同名匹配不合并")
    expect(wrapper.text()).toContain("每页 20 条")
    expect(archiveApiMocks.getPerson).not.toHaveBeenCalled()

    await wrapper.findAll('[data-test="view-matched-archive"]')[0]?.trigger("click")
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
