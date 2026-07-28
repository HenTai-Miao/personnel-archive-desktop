import { flushPromises, mount } from "@vue/test-utils"
import ElementPlus from "element-plus"
import { createPinia } from "pinia"
import { afterEach, describe, expect, it, vi } from "vitest"
import { createMemoryHistory, createRouter } from "vue-router"
import { fetchPersons } from "@/features/person-list/api"
import PersonListPage from "@/features/person-list/PersonListPage.vue"
import { personListItemSchema } from "@/features/person-list/schemas"
import { PERSON_DETAIL_FIXTURE } from "../support/person-detail-fixture"

const apiMocks = vi.hoisted(() => ({
  getPerson: vi.fn(),
  downloadPersonPhoto: vi.fn(),
  revealSensitiveValue: vi.fn(),
}))

vi.mock("@/features/person-list/api", () => ({
  fetchPersons: vi.fn(),
  downloadPersonArchives: vi.fn(),
}))

vi.mock("@/features/archive-view/open-archive", () => ({
  downloadAndOpenArchive: vi.fn(),
}))

vi.mock("@/features/archive-view/api", () => apiMocks)

afterEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

const PERSON = personListItemSchema.parse({
  id: "7",
  employeeNo: "E-007",
  name: "测试人员",
  organization: "测试单位",
  department: "档案部",
  position: "档案员",
  titleOrSkill: "馆员",
  updatedAt: "2026-07-22T03:00:00Z",
})

const PERSON_PAGE = {
  content: [PERSON],
  page: 0,
  size: 20,
  totalElements: 1,
  totalPages: 1,
}

async function mountPage() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/persons", component: PersonListPage },
      { path: "/persons/:personId", name: "person-detail", component: { template: "<div />" } },
    ],
  })
  await router.push("/persons")
  await router.isReady()
  const wrapper = mount(PersonListPage, {
    global: { plugins: [createPinia(), router, ElementPlus] },
  })
  await flushPromises()
  return wrapper
}

describe("PersonListPage B-series reading desk", () => {
  it("opens the complete dossier only after explicit record activation", async () => {
    vi.mocked(fetchPersons).mockResolvedValue(PERSON_PAGE)
    apiMocks.getPerson.mockResolvedValue({
      ...PERSON_DETAIL_FIXTURE,
      id: PERSON.id,
      name: PERSON.name,
      employeeNo: PERSON.employeeNo,
      photo: null,
    })

    const wrapper = await mountPage()

    expect(apiMocks.getPerson).not.toHaveBeenCalled()
    expect(wrapper.find(".person-reading-layout").exists()).toBe(true)
    expect(wrapper.find(".person-record-index").text()).toContain("在册卷宗")
    expect(wrapper.find(".dossier-selection-empty").text()).toContain("请选择卷宗")
    expect(wrapper.find(".person-reading-layout .dossier-navigation").exists()).toBe(false)
    expect(wrapper.find(".person-reading-layout .dossier-outline").exists()).toBe(false)
    expect(wrapper.find(".person-reading-layout .dossier-mobile-index").exists()).toBe(false)

    await wrapper.get(`[data-test="activate-person-${PERSON.id}"]`).trigger("click")
    await flushPromises()

    expect(apiMocks.getPerson).toHaveBeenCalledWith(PERSON.id)
    expect(wrapper.find(".dossier-reading-sheet").text()).toContain(PERSON.name)
    expect(wrapper.find(".person-record-button.active").attributes("aria-current")).toBe("true")
    wrapper.unmount()
  })

  it("offers a retry for a failed explicit dossier read", async () => {
    vi.mocked(fetchPersons).mockResolvedValue(PERSON_PAGE)
    apiMocks.getPerson.mockRejectedValueOnce(new Error("服务暂不可用")).mockResolvedValueOnce({
      ...PERSON_DETAIL_FIXTURE,
      id: PERSON.id,
      photo: null,
    })
    const wrapper = await mountPage()

    await wrapper.get(`[data-test="activate-person-${PERSON.id}"]`).trigger("click")
    await flushPromises()
    expect(wrapper.find(".person-dossier-stage").text()).toContain("卷宗读取失败")

    await wrapper.get('[data-test="retry-active-dossier"]').trigger("click")
    await flushPromises()
    expect(apiMocks.getPerson).toHaveBeenCalledTimes(2)
    expect(wrapper.find(".dossier-reading-sheet").text()).toContain("测试甲")
    wrapper.unmount()
  })
})
