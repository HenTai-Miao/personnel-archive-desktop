/** 字段级导入错误展示测试：当前批次与永久历史共用稳定错误码驱动的完整问题弹窗。 */
import { DOMWrapper, flushPromises, mount } from "@vue/test-utils"
import ElementPlus from "element-plus"
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
import ImportFieldIssuesDialog from "@/features/archive-import/ImportFieldIssuesDialog.vue"
import ImportHistoryPanel from "@/features/archive-import/ImportHistoryPanel.vue"
import ImportPage from "@/features/archive-import/ImportPage.vue"
import ImportResultMessage from "@/features/archive-import/ImportResultMessage.vue"
import type { ImportRow } from "@/features/archive-import/queue-model"
import { importHistoryPageSchema, importItemSchema } from "@/features/archive-import/schemas"
import { useImportStore } from "@/features/archive-import/store"

vi.mock("@/features/archive-import/api", () => ({
  fetchImportHistory: vi.fn(),
  submitDecision: vi.fn(),
  uploadWorkbooks: vi.fn(),
}))

const FIELD_MESSAGE =
  "家庭成员第 1 行年龄导入失败（基本情况!D39）：必须填写精确年龄\n" +
  "出生年月导入失败（基本情况!F3）：必须填写明确日期"

type Row = { readonly code: string; readonly message: string }
const visibleRowKey: InjectionKey<Ref<Row | undefined>> = Symbol("visible-import-result-row")
const tableStub = defineComponent({
  name: "ElTable",
  props: { data: { type: Array as PropType<readonly Row[]>, required: true } },
  setup(props, { slots }) {
    provide(
      visibleRowKey,
      computed(() => props.data[0]),
    )
    return () => h("div", { "data-test": "import-result-table" }, slots["default"]?.())
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

function emptyHistory() {
  return importHistoryPageSchema.parse({
    content: [],
    page: 0,
    size: 20,
    totalElements: 0,
    totalPages: 0,
  })
}

function currentFailure(): ImportRow {
  return {
    ...importItemSchema.parse({
      itemId: "field-failure-current",
      fileName: "字段错误.xlsx",
      status: "FAILED",
      code: "IMPORT_FIELD_VALIDATION_FAILED",
      message: FIELD_MESSAGE,
    }),
    source: { kind: "MANUAL" },
    localState: { kind: "MANUAL_RETAINED" },
  }
}

function mountOptions() {
  return {
    attachTo: document.body,
    global: {
      plugins: [ElementPlus],
      stubs: { ElTable: tableStub, ElTableColumn: tableColumnStub },
    },
  }
}

afterEach(() => {
  document.body.innerHTML = ""
  vi.restoreAllMocks()
})

beforeEach(() => {
  setActivePinia(createPinia())
  vi.mocked(fetchImportHistory).mockReset()
  vi.mocked(fetchImportHistory).mockResolvedValue(emptyHistory())
})

describe("import field validation details", () => {
  it("closesTheSharedDialogFromTheExplicitFooterAction", async () => {
    const wrapper = mount(ImportFieldIssuesDialog, {
      ...mountOptions(),
      props: {
        modelValue: true,
        fileName: "字段错误.xlsx",
        message: FIELD_MESSAGE,
      },
    })
    await flushPromises()

    await new DOMWrapper(document.body)
      .get('[data-test="close-import-field-issues"]')
      .trigger("click")

    expect(wrapper.emitted("update:modelValue")).toContainEqual([false])
    wrapper.unmount()
  })

  it("copiesTheExactServerProvidedIssueMessage", async () => {
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined)
    const wrapper = mount(ImportFieldIssuesDialog, {
      ...mountOptions(),
      props: {
        modelValue: true,
        fileName: "字段错误.xlsx",
        message: FIELD_MESSAGE,
      },
    })
    await flushPromises()

    await new DOMWrapper(document.body)
      .get('[data-test="copy-import-field-issues"]')
      .trigger("click")
    await flushPromises()

    expect(writeText).toHaveBeenCalledWith(FIELD_MESSAGE)
    wrapper.unmount()
  })

  it("delegatesOpeningFieldIssuesToTheOwningPanel", async () => {
    const wrapper = mount(ImportResultMessage, {
      ...mountOptions(),
      props: { code: "IMPORT_FIELD_VALIDATION_FAILED", message: FIELD_MESSAGE },
    })

    await wrapper.get('[data-test="show-import-field-issues"]').trigger("click")

    expect(wrapper.emitted("show-issues")).toHaveLength(1)
    wrapper.unmount()
  })

  it("showsTheFirstIssueAndAllIssuesForTheCurrentBatch", async () => {
    useImportStore().items = [currentFailure()]
    const wrapper = mount(ImportPage, mountOptions())
    await flushPromises()

    expect(wrapper.get('[data-test="import-result-message-summary"]').text()).toContain(
      "家庭成员第 1 行年龄导入失败（基本情况!D39）",
    )
    expect(wrapper.text()).not.toContain("出生年月导入失败")

    await wrapper.get('[data-test="show-import-field-issues"]').trigger("click")
    await flushPromises()

    const body = new DOMWrapper(document.body)
    const overlay = body.get(".import-field-issues-dialog").element.closest(".el-overlay")
    expect(overlay).not.toBeNull()
    expect(overlay?.closest("[data-v-app]")).toBeNull()
    const dialog = body.get(".import-field-issues-dialog")
    expect(dialog.text()).toContain("字段错误.xlsx")
    expect(dialog.text()).toContain("请按单元格位置修正后重新上传，原文件未被修改。")
    expect(dialog.findAll(".import-field-issues-list li").map((item) => item.text())).toEqual([
      "家庭成员第 1 行年龄导入失败（基本情况!D39）：必须填写精确年龄",
      "出生年月导入失败（基本情况!F3）：必须填写明确日期",
    ])
    wrapper.unmount()
  })

  it("showsTheSameFieldIssueDetailsFromPermanentHistory", async () => {
    vi.mocked(fetchImportHistory).mockResolvedValueOnce(
      importHistoryPageSchema.parse({
        content: [
          {
            itemId: "field-failure-history",
            batchId: "field-failure-batch",
            operatorName: "测试管理员",
            fileName: "历史字段错误.xlsx",
            status: "FAILED",
            code: "IMPORT_FIELD_VALIDATION_FAILED",
            message: FIELD_MESSAGE,
            processedAt: "2026-07-30T01:02:03Z",
          },
        ],
        page: 0,
        size: 20,
        totalElements: 1,
        totalPages: 1,
      }),
    )
    const wrapper = mount(ImportHistoryPanel, {
      ...mountOptions(),
      props: { refreshKey: "history-field-failure" },
    })
    await flushPromises()

    expect(wrapper.get('[data-test="import-result-message-summary"]').text()).toContain(
      "家庭成员第 1 行年龄导入失败（基本情况!D39）",
    )
    await wrapper.get('[data-test="show-import-field-issues"]').trigger("click")
    await flushPromises()

    expect(new DOMWrapper(document.body).get(".import-field-issues-dialog").text()).toContain(
      "出生年月导入失败（基本情况!F3）",
    )
    wrapper.unmount()
  })

  it("keepsOrdinaryErrorsAsPlainText", () => {
    const wrapper = mount(ImportResultMessage, {
      ...mountOptions(),
      props: { code: "TEMPLATE_INVALID", message: "档案模板结构不正确" },
    })

    expect(wrapper.text()).toContain("档案模板结构不正确")
    expect(wrapper.find('[data-test="show-import-field-issues"]').exists()).toBe(false)
    wrapper.unmount()
  })
})
