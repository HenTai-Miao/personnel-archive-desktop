/** 导入列表分页测试：上传队列和逐项结果均固定每页展示 20 条。 */
import { mount } from "@vue/test-utils"
import ElementPlus from "element-plus"
import { createPinia, setActivePinia } from "pinia"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { defineComponent } from "vue"
import { fetchImportHistory } from "@/features/archive-import/api"
import ImportPage from "@/features/archive-import/ImportPage.vue"
import type { ImportRow, QueuedWorkbook } from "@/features/archive-import/queue-model"
import {
  type ImportStatus,
  importHistoryPageSchema,
  importItemSchema,
} from "@/features/archive-import/schemas"
import { useImportStore } from "@/features/archive-import/store"

vi.mock("@/features/archive-import/api", () => ({
  fetchImportHistory: vi.fn(),
  submitDecision: vi.fn(),
  uploadWorkbooks: vi.fn(),
}))

const tableStub = defineComponent({
  name: "ElTable",
  props: { data: { type: Array, required: true } },
  template:
    '<div data-test="visible-results" :data-count="data.length">{{ data.map((row) => row.fileName).join("|") }}</div>',
})

const paginationStub = defineComponent({
  name: "ElPagination",
  props: {
    currentPage: { type: Number, required: true },
    pageSize: { type: Number, required: true },
    total: { type: Number, required: true },
  },
  emits: ["current-change"],
  template:
    '<button data-test="pagination-next" @click="$emit(\'current-change\', currentPage + 1)">下一页</button>',
})

function importRows(count: number): readonly ImportRow[] {
  return Array.from({ length: count }, (_, index) => ({
    ...importItemSchema.parse({
      itemId: `item-${index + 1}`,
      fileName: `结果-${String(index + 1).padStart(2, "0")}.xlsx`,
      status: "IMPORTED",
      code: "IMPORTED",
      message: "导入成功",
    }),
    source: { kind: "MANUAL" } as const,
    localState: { kind: "MANUAL_RETAINED" } as const,
  }))
}

function importRowsWithStatuses(statuses: readonly ImportStatus[]): readonly ImportRow[] {
  return statuses.map((status, index) => ({
    ...importItemSchema.parse({
      itemId: `summary-${index + 1}`,
      fileName: `汇总-${index + 1}.xlsx`,
      status,
      code: status,
      message: "处理结果",
    }),
    source: { kind: "MANUAL" } as const,
    localState: { kind: "MANUAL_RETAINED" } as const,
  }))
}

function queuedWorkbooks(count: number): readonly QueuedWorkbook[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `queue-${index + 1}`,
    file: new File([], `队列-${String(index + 1).padStart(2, "0")}.xlsx`),
    source: { kind: "MANUAL" } as const,
  }))
}

function mountImportPage() {
  return mount(ImportPage, {
    global: {
      plugins: [ElementPlus],
      stubs: { ElTable: tableStub, ElTableColumn: true, ElPagination: paginationStub },
    },
  })
}

describe("ImportPage list pagination", () => {
  beforeEach(() => {
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

  it("shows only the first 20 import results on the first page", () => {
    // Given
    setActivePinia(createPinia())
    useImportStore().items = importRows(21)
    useImportStore().queuedWorkbooks = queuedWorkbooks(1)

    // When
    const wrapper = mountImportPage()

    // Then
    expect(wrapper.find(".import-workflow-stack").exists()).toBe(true)
    expect(wrapper.find(".import-picker-sheet").text()).toContain("选择文件")
    expect(wrapper.find(".import-queued-section").exists()).toBe(true)
    expect(wrapper.find(".import-queued-caption").text()).toContain("待处理文件")
    expect(wrapper.find(".import-current-sheet").text()).toContain("当前批次")
    expect(wrapper.find("#import-history").exists()).toBe(true)
    expect(wrapper.find(".import-reading-layout").exists()).toBe(false)
    expect(wrapper.find(".import-queue-index").exists()).toBe(false)
    expect(wrapper.find(".import-outline").exists()).toBe(false)
    const results = wrapper.get('[data-test="visible-results"]')
    expect(results.attributes("data-count")).toBe("20")
    expect(results.text()).toContain("结果-20.xlsx")
    expect(results.text()).not.toContain("结果-21.xlsx")
    expect(wrapper.text()).toContain("每页 20 条")
    wrapper.unmount()
  })

  it("labelsABatchAsAllFailedWhenEveryWorkbookFailed", () => {
    // Given
    setActivePinia(createPinia())
    useImportStore().items = importRowsWithStatuses(["FAILED", "FAILED"])

    // When
    const wrapper = mountImportPage()

    // Then
    expect(wrapper.text()).toContain("全部失败")
    expect(wrapper.text()).not.toContain("部分成功")
    wrapper.unmount()
  })

  it("labelsABatchAsPartiallySuccessfulWhenSuccessAndFailureAreMixed", () => {
    // Given
    setActivePinia(createPinia())
    useImportStore().items = importRowsWithStatuses(["IMPORTED", "FAILED"])

    // When
    const wrapper = mountImportPage()

    // Then
    expect(wrapper.text()).toContain("部分成功")
    expect(wrapper.text()).not.toContain("全部失败")
    wrapper.unmount()
  })

  it("shows the remaining import result after moving to the second page", async () => {
    // Given
    setActivePinia(createPinia())
    useImportStore().items = importRows(21)
    const wrapper = mountImportPage()

    // When
    await wrapper.get('[data-test="pagination-next"]').trigger("click")

    // Then
    const results = wrapper.get('[data-test="visible-results"]')
    expect(results.attributes("data-count")).toBe("1")
    expect(results.text()).toContain("结果-21.xlsx")
    expect(results.text()).not.toContain("结果-01.xlsx")
    wrapper.unmount()
  })

  it("shows only the first 20 queued workbooks on the first page", () => {
    // Given
    setActivePinia(createPinia())
    useImportStore().queuedWorkbooks = queuedWorkbooks(21)

    // When
    const wrapper = mountImportPage()

    // Then
    expect(wrapper.findAll(".queued-file-chip")).toHaveLength(20)
    expect(wrapper.text()).toContain("队列-20.xlsx")
    expect(wrapper.text()).not.toContain("队列-21.xlsx")
    expect(wrapper.text()).toContain("每页 20 条")
    wrapper.unmount()
  })

  it("shows the remaining queued workbook after moving to the second page", async () => {
    // Given
    setActivePinia(createPinia())
    useImportStore().queuedWorkbooks = queuedWorkbooks(21)
    const wrapper = mountImportPage()

    // When
    await wrapper.get('[data-test="pagination-next"]').trigger("click")

    // Then
    expect(wrapper.findAll(".queued-file-chip")).toHaveLength(1)
    expect(wrapper.text()).toContain("队列-21.xlsx")
    expect(wrapper.text()).not.toContain("队列-01.xlsx")
    wrapper.unmount()
  })
})
