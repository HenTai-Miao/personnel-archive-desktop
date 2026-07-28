/** 档案列表批量导出测试：从表格多选，经服务端 ZIP 下载，到原生保存动作。 */
import type { PersonnelArchiveBridge } from "@shared/ipc-contract"
import { flushPromises, mount } from "@vue/test-utils"
import ElementPlus from "element-plus"
import { createPinia, setActivePinia } from "pinia"
import { afterEach, describe, expect, it, vi } from "vitest"
import { createMemoryHistory, createRouter } from "vue-router"
import { useAuthStore } from "@/features/auth/store"
import { downloadPersonArchives, fetchPersons } from "@/features/person-list/api"
import PersonListPage from "@/features/person-list/PersonListPage.vue"
import { personListItemSchema } from "@/features/person-list/schemas"
import { usePersonListStore } from "@/features/person-list/store"
import { userSchema } from "@/shared/api/schemas"
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
  vi.clearAllMocks()
})

describe("PersonListPage batch export", () => {
  it("does not load a dossier when rows are selected for batch export", async () => {
    // Given
    const person = personListItemSchema.parse({
      id: "9007199254740993",
      employeeNo: "E-001",
      name: "测试甲",
      organization: "测试单位",
      department: "档案部",
      position: "职员",
      titleOrSkill: "",
      updatedAt: "2026-07-22T03:00:00Z",
    })
    vi.mocked(fetchPersons).mockResolvedValue({
      content: [person],
      page: 0,
      size: 20,
      totalElements: 1,
      totalPages: 1,
    })
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/persons", component: PersonListPage },
        { path: "/persons/:personId", name: "person-detail", component: { template: "<div />" } },
      ],
    })
    await router.push("/persons")
    await router.isReady()
    const pinia = createPinia()
    setActivePinia(pinia)
    const wrapper = mount(PersonListPage, {
      global: { plugins: [pinia, router, ElementPlus] },
    })
    await flushPromises()

    // When
    await wrapper.get(`[data-test="select-person-${person.id}"]`).setValue(true)

    // Then
    expect(apiMocks.getPerson).not.toHaveBeenCalled()
    apiMocks.getPerson.mockResolvedValue({
      ...PERSON_DETAIL_FIXTURE,
      id: person.id,
      photo: null,
    })
    await wrapper.get(`[data-test="activate-person-${person.id}"]`).trigger("click")
    await flushPromises()
    expect(apiMocks.getPerson).toHaveBeenCalledWith(person.id)
    expect(usePersonListStore().selectedPersonIds).toEqual([person.id])
    wrapper.unmount()
  })

  it("downloads selected archives and saves one zip bundle", async () => {
    // Given
    const person = personListItemSchema.parse({
      id: "9007199254740993",
      employeeNo: "E-001",
      name: "测试甲",
      organization: "测试单位",
      department: "档案部",
      position: "职员",
      titleOrSkill: "",
      updatedAt: "2026-07-22T03:00:00Z",
    })
    const secondPerson = personListItemSchema.parse({
      ...person,
      id: "9007199254740995",
      employeeNo: "E-002",
      name: "测试乙",
    })
    vi.mocked(fetchPersons).mockResolvedValue({
      content: [person, secondPerson],
      page: 0,
      size: 20,
      totalElements: 2,
      totalPages: 1,
    })
    const bundleBytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04])
    vi.mocked(downloadPersonArchives).mockResolvedValue(bundleBytes)
    const saveArchiveBundle = vi
      .fn<PersonnelArchiveBridge["saveArchiveBundle"]>()
      .mockResolvedValue({
        status: "SAVED",
        fileName: "人员档案批量导出-20260722-110405.zip",
      })
    Object.defineProperty(window, "personnelArchive", {
      configurable: true,
      value: { saveArchiveBundle },
    })
    const pinia = createPinia()
    setActivePinia(pinia)
    useAuthStore().user = userSchema.parse({
      id: "1",
      username: "admin",
      displayName: "管理员",
      roles: ["ADMIN"],
    })
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
      global: { plugins: [pinia, router, ElementPlus] },
    })
    await flushPromises()

    // When
    await wrapper.get(`[data-test="select-person-${person.id}"]`).setValue(true)
    await wrapper.get(`[data-test="select-person-${secondPerson.id}"]`).setValue(true)
    await wrapper.get('[data-test="batch-export"]').trigger("click")
    await flushPromises()

    // Then
    expect(downloadPersonArchives).toHaveBeenCalledWith([person.id, secondPerson.id])
    expect(saveArchiveBundle).toHaveBeenCalledWith({
      suggestedName: expect.stringMatching(/^人员档案批量导出-\d{8}-\d{6}\.zip$/),
      bytes: bundleBytes,
    })
    expect(wrapper.text()).toContain("已保存 2 份档案")
    wrapper.unmount()
  })
})
