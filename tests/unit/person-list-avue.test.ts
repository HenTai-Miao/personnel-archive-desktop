/** Avue 档案目录测试：核心表格交给 Avue 渲染，同时保留既有字段和业务操作。 */
import { flushPromises, mount } from "@vue/test-utils"
import ElementPlus from "element-plus"
import { createPinia } from "pinia"
import { afterEach, describe, expect, it, vi } from "vitest"
import { defineComponent } from "vue"
import { createMemoryHistory, createRouter } from "vue-router"
import { fetchPersons } from "@/features/person-list/api"
import PersonListPage from "@/features/person-list/PersonListPage.vue"
import { personListItemSchema } from "@/features/person-list/schemas"
import { PERSON_DETAIL_FIXTURE } from "../support/person-detail-fixture"

const apiMocks = vi.hoisted(() => ({
  getPerson: vi.fn(),
  downloadPersonPhoto: vi.fn(),
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

const AVUE_CRUD_STUB = defineComponent({
  name: "AvueCrud",
  props: {
    data: { type: Array, required: true },
    option: { type: Object, required: true },
    rowClassName: { type: Function, default: () => "" },
  },
  emits: ["row-click", "selection-change"],
  template: `
    <div>
      <span v-for="column in option.column" :key="column.prop">{{ column.label }}</span>
      <span>{{ option.menuTitle }}</span>
      <template v-if="data.length">
        <span data-test="row-class">{{ rowClassName({ row: data[0] }) }}</span>
        <slot name="employeeNo" :row="data[0]" />
        <slot name="name" :row="data[0]" />
        <slot name="organization" :row="data[0]" />
        <slot name="menu" :row="data[0]" />
      </template>
    </div>
  `,
})

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
    global: {
      plugins: [createPinia(), router, ElementPlus],
      stubs: { AvueCrud: AVUE_CRUD_STUB, ElTable: true, ElTableColumn: true },
    },
  })
  await flushPromises()
  return wrapper
}

describe("PersonListPage Avue directory", () => {
  it("keeps the dossier preview hidden before an explicit selection", async () => {
    // Given
    vi.mocked(fetchPersons).mockResolvedValue(PERSON_PAGE)

    // When
    const wrapper = await mountPage()

    // Then
    expect(apiMocks.getPerson).not.toHaveBeenCalled()
    expect(wrapper.find('[data-test="person-preview"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="row-class"]').text()).toBe("")
    wrapper.unmount()
  })

  it("keeps the personnel columns and actions when Avue renders the directory", async () => {
    // Given
    vi.mocked(fetchPersons).mockResolvedValue(PERSON_PAGE)

    // When
    const wrapper = await mountPage()

    // Then
    expect(wrapper.text()).toContain("人员编号")
    expect(wrapper.text()).toContain("姓名")
    expect(wrapper.text()).toContain("单位 / 部门")
    expect(wrapper.text()).toContain("职务")
    expect(wrapper.text()).toContain("职称 / 技能")
    expect(wrapper.text()).toContain("更新日期")
    expect(wrapper.text()).toContain("档案操作")
    expect(wrapper.text()).toContain("测试人员")
    expect(wrapper.text()).toContain("预览")
    expect(wrapper.text()).toContain("查看")
    expect(wrapper.text()).toContain("导出")
    expect(wrapper.getComponent(AVUE_CRUD_STUB).props("option")).toMatchObject({
      header: false,
      page: false,
      tip: false,
      border: true,
      stripe: true,
    })
    wrapper.unmount()
  })

  it("loads the dossier only after an explicit preview action", async () => {
    // Given
    vi.mocked(fetchPersons).mockResolvedValue(PERSON_PAGE)
    apiMocks.getPerson.mockResolvedValue({
      ...PERSON_DETAIL_FIXTURE,
      id: PERSON.id,
      name: PERSON.name,
      employeeNo: PERSON.employeeNo,
      mainEducation: [{ sortOrder: 1, leftText: "2018—2022", rightText: "测试大学 本科" }],
      workExperiences: [{ sortOrder: 1, leftText: "2022—至今", rightText: "测试单位 档案员" }],
      rewardsPunishments: [{ sortOrder: 1, leftText: "2025", rightText: "测试表彰" }],
      familyMembers: [
        {
          name: "测试家属",
          relationship: "母亲",
          birthDate: "1970-01-01",
          age: 56,
          politicalStatus: "群众",
          organizationAndPosition: "测试单位 职员",
        },
      ],
      declaration: { signer: "测试甲", date: "2026-07-22" },
      photo: {
        mimeType: "image/png",
        originalFilename: "preview.png",
        byteSize: 5,
        widthPixels: 120,
        heightPixels: 160,
      },
    })
    apiMocks.downloadPersonPhoto.mockResolvedValue(new Blob(["photo"], { type: "image/png" }))
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:person-preview")
    const wrapper = await mountPage()
    expect(apiMocks.getPerson).not.toHaveBeenCalled()
    expect(wrapper.get('[data-test="row-class"]').text()).toBe("")

    // When
    await wrapper.get('[data-test="preview-person"]').trigger("click")
    await flushPromises()

    // Then
    expect(apiMocks.getPerson).toHaveBeenCalledWith(PERSON.id)
    const preview = wrapper.get('[data-test="person-preview"]')
    expect(preview.text()).toContain(PERSON.name)
    expect(preview.text()).toContain(PERSON_DETAIL_FIXTURE.identityCardMasked)
    expect(preview.text()).toContain(PERSON_DETAIL_FIXTURE.personal.phoneNumberMasked)
    expect(preview.text()).toContain("测试大学 本科")
    expect(preview.text()).toContain("测试单位 档案员")
    expect(preview.text()).toContain("测试表彰")
    expect(preview.text()).toContain("测试家属")
    expect(preview.text()).toContain("2026-07-22")
    expect(preview.text()).not.toContain("显示完整")
    expect(preview.get("img").attributes("src")).toBe("blob:person-preview")
    expect(wrapper.get('[data-test="row-class"]').text()).toBe("is-preview-active")
    wrapper.unmount()
  })

  it("closes the dossier preview and clears its active row", async () => {
    // Given
    vi.mocked(fetchPersons).mockResolvedValue(PERSON_PAGE)
    apiMocks.getPerson.mockResolvedValue({ ...PERSON_DETAIL_FIXTURE, id: PERSON.id })
    const wrapper = await mountPage()
    await wrapper.get('[data-test="preview-person"]').trigger("click")
    await flushPromises()
    expect(wrapper.get('[data-test="row-class"]').text()).toBe("is-preview-active")

    // When
    await wrapper.get('[aria-label="关闭卷宗预览"]').trigger("click")
    await flushPromises()

    // Then
    expect(wrapper.find('[data-test="person-preview"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="row-class"]').text()).toBe("")
    wrapper.unmount()
  })

  it("shows the preview resize separator only after a dossier is selected", async () => {
    // Given
    vi.mocked(fetchPersons).mockResolvedValue(PERSON_PAGE)
    apiMocks.getPerson.mockResolvedValue({ ...PERSON_DETAIL_FIXTURE, id: PERSON.id })
    const wrapper = await mountPage()
    expect(wrapper.find('[data-test="person-preview-resizer"]').exists()).toBe(false)

    // When
    await wrapper.get('[data-test="preview-person"]').trigger("click")
    await flushPromises()

    // Then
    expect(wrapper.get('[data-test="person-preview-resizer"]').attributes("role")).toBe("separator")
    wrapper.unmount()
  })

  it("returns the preview to idle before a filter request", async () => {
    // Given
    vi.mocked(fetchPersons).mockResolvedValue(PERSON_PAGE)
    apiMocks.getPerson.mockResolvedValue({ ...PERSON_DETAIL_FIXTURE, id: PERSON.id })
    const wrapper = await mountPage()
    await wrapper.get('[data-test="preview-person"]').trigger("click")
    await flushPromises()
    expect(wrapper.get('[data-test="person-preview"]').text()).toContain("测试甲")
    expect(wrapper.get('[data-test="row-class"]').text()).toBe("is-preview-active")

    // When
    await wrapper.get("form").trigger("submit")

    // Then
    expect(wrapper.find('[data-test="person-preview"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="row-class"]').text()).toBe("")
    wrapper.unmount()
  })

  it("loads the dossier when its directory row is activated", async () => {
    // Given
    vi.mocked(fetchPersons).mockResolvedValue(PERSON_PAGE)
    apiMocks.getPerson.mockResolvedValue({ ...PERSON_DETAIL_FIXTURE, id: PERSON.id })
    const wrapper = await mountPage()

    // When
    wrapper.getComponent(AVUE_CRUD_STUB).vm.$emit("row-click", PERSON)
    await flushPromises()

    // Then
    expect(apiMocks.getPerson).toHaveBeenCalledWith(PERSON.id)
    expect(wrapper.get('[data-test="person-preview"]').text()).toContain("测试甲")
    expect(wrapper.get('[data-test="row-class"]').text()).toBe("is-preview-active")
    wrapper.unmount()
  })

  it("shows a recoverable failure when the selected dossier cannot be read", async () => {
    // Given
    vi.mocked(fetchPersons).mockResolvedValue(PERSON_PAGE)
    apiMocks.getPerson.mockRejectedValue(new Error("服务暂不可用"))
    const wrapper = await mountPage()

    // When
    await wrapper.get('[data-test="preview-person"]').trigger("click")
    await flushPromises()

    // Then
    const preview = wrapper.get('[data-test="person-preview"]')
    expect(preview.text()).toContain("卷宗读取失败")
    expect(preview.text()).toContain("重新读取")
    wrapper.unmount()
  })
})
