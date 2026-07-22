/** Avue 档案目录测试：核心表格交给 Avue 渲染，同时保留既有字段和业务操作。 */
import { flushPromises, mount } from "@vue/test-utils"
import ElementPlus from "element-plus"
import { createPinia } from "pinia"
import { describe, expect, it, vi } from "vitest"
import { defineComponent } from "vue"
import { createMemoryHistory, createRouter } from "vue-router"
import { fetchPersons } from "@/features/person-list/api"
import PersonListPage from "@/features/person-list/PersonListPage.vue"
import { personListItemSchema } from "@/features/person-list/schemas"

vi.mock("@/features/person-list/api", () => ({
  fetchPersons: vi.fn(),
  downloadPersonArchives: vi.fn(),
}))

vi.mock("@/features/archive-view/open-archive", () => ({
  downloadAndOpenArchive: vi.fn(),
}))

describe("PersonListPage Avue directory", () => {
  it("keeps the personnel columns and actions when Avue renders the directory", async () => {
    // Given
    vi.mocked(fetchPersons).mockResolvedValue({
      content: [
        personListItemSchema.parse({
          id: "7",
          employeeNo: "E-007",
          name: "测试人员",
          organization: "测试单位",
          department: "档案部",
          position: "档案员",
          titleOrSkill: "馆员",
          updatedAt: "2026-07-22T03:00:00Z",
        }),
      ],
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
    const avueCrudStub = defineComponent({
      name: "AvueCrud",
      props: { data: { type: Array, required: true }, option: { type: Object, required: true } },
      template: `
        <div data-test="avue-person-directory">
          <span v-for="column in option.column" :key="column.prop">{{ column.label }}</span>
          <span>{{ option.menuTitle }}</span>
          <template v-if="data.length">
            <slot name="employeeNo" :row="data[0]" />
            <slot name="name" :row="data[0]" />
            <slot name="organization" :row="data[0]" />
            <slot name="menu" :row="data[0]" />
          </template>
        </div>
      `,
    })

    // When
    const wrapper = mount(PersonListPage, {
      global: {
        plugins: [createPinia(), router, ElementPlus],
        stubs: { AvueCrud: avueCrudStub, ElTable: true, ElTableColumn: true },
      },
    })
    await flushPromises()

    // Then
    const directory = wrapper.get('[data-test="avue-person-directory"]')
    expect(directory.text()).toContain("人员编号")
    expect(directory.text()).toContain("姓名")
    expect(directory.text()).toContain("单位 / 部门")
    expect(directory.text()).toContain("职务")
    expect(directory.text()).toContain("职称 / 技能")
    expect(directory.text()).toContain("更新日期")
    expect(directory.text()).toContain("档案操作")
    expect(directory.text()).toContain("测试人员")
    expect(directory.text()).toContain("查看")
    expect(directory.text()).toContain("导出")
    expect(wrapper.getComponent(avueCrudStub).props("option")).toMatchObject({
      header: false,
      page: false,
      tip: false,
      border: true,
      stripe: true,
    })
    wrapper.unmount()
  })
})
