/** 重复档案弹窗测试：外层保留规范关闭入口，覆盖二次确认只允许明确返回或确认。 */
import { DOMWrapper, flushPromises, mount } from "@vue/test-utils"
import ElementPlus, { ElMessageBox } from "element-plus"
import { createPinia, setActivePinia } from "pinia"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  computed,
  defineComponent,
  h,
  type InjectionKey,
  inject,
  type PropType,
  provide,
  type Ref,
} from "vue"
import { fetchImportHistory } from "@/features/archive-import/api"
import ImportPage from "@/features/archive-import/ImportPage.vue"
import type { ImportRow } from "@/features/archive-import/queue-model"
import { importHistoryPageSchema, importItemSchema } from "@/features/archive-import/schemas"
import { useImportStore } from "@/features/archive-import/store"

vi.mock("@/features/archive-import/api", () => ({
  fetchImportHistory: vi.fn(),
  submitDecision: vi.fn(),
  uploadWorkbooks: vi.fn(),
}))

const duplicateRow: ImportRow = {
  ...importItemSchema.parse({
    itemId: "item-duplicate-dialog",
    fileName: "重复档案.xlsx",
    status: "PENDING_DECISION",
    code: "DUPLICATE_REQUIRES_DECISION",
    message: "档案已存在，请选择覆盖或跳过",
    duplicate: {
      personName: "测试员工甲",
      identityCardLastFour: "001X",
      existingEmployeeNo: "TEST-001",
      incomingEmployeeNo: "TEST-001",
      existingUpdatedAt: "2026-07-29T03:00:00Z",
    },
  }),
  source: { kind: "MANUAL" },
  localState: { kind: "MANUAL_RETAINED" },
}

const visibleRowKey: InjectionKey<Ref<ImportRow | undefined>> = Symbol("visible-import-row")
const tableStub = defineComponent({
  name: "ElTable",
  props: { data: { type: Array as PropType<readonly ImportRow[]>, required: true } },
  setup(props, { slots }) {
    provide(
      visibleRowKey,
      computed(() => props.data[0]),
    )
    return () => h("div", { "data-test": "import-table" }, slots["default"]?.())
  },
})
const tableColumnStub = defineComponent({
  name: "ElTableColumn",
  inheritAttrs: false,
  setup(_, { slots }) {
    const visibleRow = inject(visibleRowKey)
    return () =>
      visibleRow?.value === undefined ? null : slots["default"]?.({ row: visibleRow.value })
  },
})

beforeEach(() => {
  setActivePinia(createPinia())
  vi.mocked(fetchImportHistory).mockResolvedValue(
    importHistoryPageSchema.parse({
      content: [],
      page: 0,
      size: 20,
      totalElements: 0,
      totalPages: 0,
    }),
  )
})

afterEach(() => {
  ElMessageBox.close()
  vi.restoreAllMocks()
  document.body.innerHTML = ""
})

function button(body: DOMWrapper<Element>, text: string) {
  const target = body.findAll("button").find((candidate) => candidate.text().trim() === text)
  if (target === undefined) throw new TypeError(`测试缺少“${text}”按钮`)
  return target
}

async function openOverwriteReview(errorHandler = vi.fn()) {
  useImportStore().items = [duplicateRow]
  const wrapper = mount(ImportPage, {
    attachTo: document.body,
    global: {
      plugins: [ElementPlus],
      config: { errorHandler },
      stubs: { ElTable: tableStub, ElTableColumn: tableColumnStub },
    },
  })
  await flushPromises()
  const body = new DOMWrapper(document.body)
  await button(body, "确认处理").trigger("click")
  await body.get('.decision-options input[value="OVERWRITE"]').setValue(true)
  return { wrapper, body }
}

describe("ImportPage duplicate dialog", () => {
  it("shows one outer close control and hides both close controls during overwrite review", async () => {
    const { wrapper, body } = await openOverwriteReview()
    expect(body.find(".duplicate-decision-dialog .el-dialog__headerbtn").exists()).toBe(true)

    await button(body, "继续覆盖").trigger("click")
    await flushPromises()

    expect(body.find(".el-message-box").exists()).toBe(true)
    expect(body.find(".el-message-box__headerbtn").exists()).toBe(false)
    expect(body.find(".duplicate-decision-dialog .el-dialog__headerbtn").exists()).toBe(false)

    await button(body, "返回检查").trigger("click")
    await flushPromises()

    expect(body.get(".el-message-box").isVisible()).toBe(false)
    expect(body.find(".duplicate-decision-dialog .el-dialog__headerbtn").exists()).toBe(true)
    wrapper.unmount()
  })

  it("restores the outer close control and propagates unexpected confirmation errors", async () => {
    const failure = new Error("覆盖确认组件异常")
    vi.spyOn(ElMessageBox, "confirm").mockRejectedValueOnce(failure)
    const errorHandler = vi.fn()
    const { wrapper, body } = await openOverwriteReview(errorHandler)

    await button(body, "继续覆盖").trigger("click")
    await flushPromises()

    expect(errorHandler).toHaveBeenCalled()
    expect(errorHandler.mock.calls[0]?.[0]).toBe(failure)
    expect(body.find(".duplicate-decision-dialog .el-dialog__headerbtn").exists()).toBe(true)
    wrapper.unmount()
  })
})
