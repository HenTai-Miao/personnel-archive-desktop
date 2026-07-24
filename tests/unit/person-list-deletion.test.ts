/** 档案列表删除协作测试：覆盖角色显示、末页回退、选择/预览清理和并发刷新。 */
import { DOMWrapper, flushPromises, mount } from "@vue/test-utils"
import ElementPlus from "element-plus"
import { createPinia, setActivePinia } from "pinia"
import { afterEach, describe, expect, it, vi } from "vitest"
import { defineComponent } from "vue"
import { createMemoryHistory, createRouter } from "vue-router"
import { useAuthStore } from "@/features/auth/store"
import { deletePerson, fetchPersons } from "@/features/person-list/api"
import PersonListPage from "@/features/person-list/PersonListPage.vue"
import { personListItemSchema } from "@/features/person-list/schemas"
import { usePersonListStore } from "@/features/person-list/store"
import { ApiError } from "@/shared/api/error"
import { userSchema } from "@/shared/api/schemas"

const previewApiMocks = vi.hoisted(() => ({
  getPerson: vi.fn(),
  downloadPersonPhoto: vi.fn(),
}))

vi.mock("@/features/person-list/api", () => ({
  deletePerson: vi.fn(),
  downloadPersonArchives: vi.fn(),
  fetchPersons: vi.fn(),
}))

vi.mock("@/features/archive-view/open-archive", () => ({
  downloadAndOpenArchive: vi.fn(),
}))

vi.mock("@/features/archive-view/api", () => previewApiMocks)

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

const PAGE_ONE = {
  content: [PERSON],
  page: 1,
  size: 20,
  totalElements: 21,
  totalPages: 2,
}

const AVUE_CRUD_STUB = defineComponent({
  name: "AvueCrud",
  props: { data: { type: Array, required: true } },
  emits: ["row-click", "selection-change"],
  template: `
    <div>
      <slot v-if="data.length" name="menu" :row="data[0]" />
    </div>
  `,
})

afterEach(() => {
  vi.resetAllMocks()
  document.body.innerHTML = ""
})

async function mountPage(role: "ADMIN" | "ARCHIVE_EDITOR" | "VIEWER", initialPage = 0) {
  const pinia = createPinia()
  setActivePinia(pinia)
  useAuthStore().user = userSchema.parse({
    id: "1",
    username: "tester",
    displayName: "测试用户",
    roles: [role],
  })
  usePersonListStore().page = initialPage
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
    attachTo: document.body,
    global: { plugins: [pinia, router, ElementPlus], stubs: { AvueCrud: AVUE_CRUD_STUB } },
  })
  await flushPromises()
  return { wrapper, store: usePersonListStore(), body: new DOMWrapper(document.body) }
}

describe("PersonListPage deletion", () => {
  it.each(["ADMIN", "ARCHIVE_EDITOR"] as const)("shows deletion for %s", async (role) => {
    vi.mocked(fetchPersons).mockResolvedValue({ ...PAGE_ONE, page: 0, totalElements: 1 })

    const { wrapper } = await mountPage(role)

    expect(wrapper.find('[data-test="person-delete-trigger"]').exists()).toBe(true)
    wrapper.unmount()
  })

  it("hides deletion from viewers", async () => {
    vi.mocked(fetchPersons).mockResolvedValue({ ...PAGE_ONE, page: 0, totalElements: 1 })

    const { wrapper } = await mountPage("VIEWER")

    expect(wrapper.find('[data-test="person-delete-trigger"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it("returns from an emptied last page and clears selection and preview", async () => {
    vi.mocked(fetchPersons)
      .mockResolvedValueOnce(PAGE_ONE)
      .mockResolvedValueOnce({ content: [], page: 0, size: 20, totalElements: 20, totalPages: 1 })
    vi.mocked(deletePerson).mockResolvedValue(undefined)
    previewApiMocks.getPerson.mockReturnValue(new Promise(() => undefined))
    const { wrapper, store, body } = await mountPage("ADMIN", 1)
    const crud = wrapper.getComponent(AVUE_CRUD_STUB)
    crud.vm.$emit("selection-change", [PERSON])
    crud.vm.$emit("row-click", PERSON)
    await wrapper.vm.$nextTick()
    expect(store.selectedPersonIds).toEqual([PERSON.id])
    expect(wrapper.find('[data-test="person-preview-dock"]').exists()).toBe(true)

    await wrapper.get('[data-test="person-delete-trigger"]').trigger("click")
    await body.get('[data-test="person-delete-confirm"]').trigger("click")
    await flushPromises()

    expect(deletePerson).toHaveBeenCalledWith(PERSON.id, "误导入")
    expect(fetchPersons).toHaveBeenNthCalledWith(2, expect.objectContaining({ page: 0, size: 20 }))
    expect(store.selectedPersonIds).toEqual([])
    expect(wrapper.find('[data-test="person-preview-dock"]').exists()).toBe(false)
    expect(wrapper.text()).toContain("档案已删除")
    wrapper.unmount()
  })

  it("refreshes the current page when another operator already deleted the archive", async () => {
    vi.mocked(fetchPersons)
      .mockResolvedValueOnce({ ...PAGE_ONE, page: 0, totalElements: 1 })
      .mockResolvedValueOnce({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 })
    vi.mocked(deletePerson).mockRejectedValue(new ApiError("NOT_FOUND", "档案不存在或已删除", 404))
    const { wrapper, body } = await mountPage("ARCHIVE_EDITOR")

    await wrapper.get('[data-test="person-delete-trigger"]').trigger("click")
    await body.get('[data-test="person-delete-confirm"]').trigger("click")
    await flushPromises()

    expect(fetchPersons).toHaveBeenNthCalledWith(2, expect.objectContaining({ page: 0 }))
    expect(wrapper.text()).toContain("档案已被其他操作删除，列表已刷新")
    wrapper.unmount()
  })
})
