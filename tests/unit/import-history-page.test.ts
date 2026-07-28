/** 导入记录页面测试：当前内存结果为空时仍从服务端读取永久记录。 */
import { flushPromises, mount } from "@vue/test-utils"
import ElementPlus from "element-plus"
import { createPinia, setActivePinia } from "pinia"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { defineComponent } from "vue"
import { fetchImportHistory } from "@/features/archive-import/api"
import ImportHistoryPanel from "@/features/archive-import/ImportHistoryPanel.vue"
import ImportPage from "@/features/archive-import/ImportPage.vue"
import { importHistoryPageSchema } from "@/features/archive-import/schemas"
import { ApiError } from "@/shared/api/error"

vi.mock("@/features/archive-import/api", () => ({
  fetchImportHistory: vi.fn(),
  submitDecision: vi.fn(),
  uploadWorkbooks: vi.fn(),
}))

const tableStub = defineComponent({
  name: "ElTable",
  props: { data: { type: Array, required: true } },
  template:
    '<div data-test="history-records">{{ data.map((row) => row.fileName + "|" + row.operatorName + "|" + row.message).join(";") }}</div>',
})

type HistoryPage = ReturnType<typeof importHistoryPageSchema.parse>

function historyPage(fileName: string): HistoryPage {
  return importHistoryPageSchema.parse({
    content: [
      {
        itemId: "9007199254740993",
        batchId: "9007199254740995",
        operatorName: "测试管理员",
        fileName,
        status: "IMPORTED",
        code: "IMPORTED",
        message: "导入成功",
        processedAt: "2026-07-23T01:02:03Z",
      },
    ],
    page: 0,
    size: 20,
    totalElements: 1,
    totalPages: 1,
  })
}

function emptyHistoryPage(): HistoryPage {
  return importHistoryPageSchema.parse({
    content: [],
    page: 0,
    size: 20,
    totalElements: 0,
    totalPages: 0,
  })
}

function deferred<T>() {
  let resolve: (value: T) => void = () => {
    throw new TypeError("延迟请求尚未初始化")
  }
  const promise = new Promise<T>((complete) => {
    resolve = complete
  })
  return { promise, resolve }
}

function mountHistoryPanel() {
  return mount(ImportHistoryPanel, {
    props: { refreshKey: "initial" },
    global: {
      plugins: [ElementPlus],
      stubs: { ElTable: tableStub, ElTableColumn: true },
    },
  })
}

describe("ImportPage history", () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(fetchImportHistory).mockReset()
    vi.mocked(fetchImportHistory).mockResolvedValue(
      importHistoryPageSchema.parse({
        content: [
          {
            itemId: "9007199254740993",
            batchId: "9007199254740995",
            operatorName: "测试管理员",
            fileName: "档案甲.xlsx",
            status: "FAILED",
            code: "TEMPLATE_INVALID",
            message: "档案模板结构不正确",
            processedAt: "2026-07-23T01:02:03Z",
          },
        ],
        page: 0,
        size: 20,
        totalElements: 1,
        totalPages: 1,
      }),
    )
  })

  it("showsPersistedResultsWhenTheCurrentSessionHasNoResults", async () => {
    // Given
    const wrapper = mount(ImportPage, {
      global: {
        plugins: [ElementPlus],
        stubs: { ElTable: tableStub, ElTableColumn: true },
      },
    })

    // When
    await flushPromises()

    // Then
    expect(fetchImportHistory).toHaveBeenCalledWith({ page: 0, size: 20 })
    expect(wrapper.find(".import-history-sheet").exists()).toBe(true)
    expect(wrapper.find("#import-history").exists()).toBe(true)
    expect(wrapper.text()).toContain("导入记录")
    expect(wrapper.text()).toContain("永久历史")
    expect(wrapper.text()).toContain("重新打开软件仍可查询")
    expect(wrapper.get('[data-test="history-records"]').text()).toContain(
      "档案甲.xlsx|测试管理员|档案模板结构不正确",
    )
    wrapper.unmount()
  })

  it("showsOnlyTheErrorStateWhenTheFirstHistoryRequestFails", async () => {
    // Given
    vi.mocked(fetchImportHistory).mockRejectedValueOnce(
      new ApiError("FORBIDDEN", "当前账号没有执行此操作的权限", 403),
    )
    const wrapper = mountHistoryPanel()

    // When
    await flushPromises()

    // Then
    expect(wrapper.text()).toContain("当前账号没有执行此操作的权限")
    expect(wrapper.text()).not.toContain("暂无导入记录")
    wrapper.unmount()
  })

  it("keepsTheNewestHistoryResponseWhenAnOlderRequestFinishesLast", async () => {
    // Given
    const olderRequest = deferred<HistoryPage>()
    const newestRequest = deferred<HistoryPage>()
    vi.mocked(fetchImportHistory)
      .mockReset()
      .mockReturnValueOnce(olderRequest.promise)
      .mockReturnValueOnce(newestRequest.promise)
    const wrapper = mountHistoryPanel()
    await wrapper.setProps({ refreshKey: "new-result" })

    // When
    newestRequest.resolve(historyPage("最新记录.xlsx"))
    await flushPromises()
    olderRequest.resolve(historyPage("旧记录.xlsx"))
    await flushPromises()

    // Then
    expect(wrapper.get('[data-test="history-records"]').text()).toContain("最新记录.xlsx")
    expect(wrapper.get('[data-test="history-records"]').text()).not.toContain("旧记录.xlsx")
    wrapper.unmount()
  })

  it("showsOnlyLoadingWhileRefreshingAnEmptyHistoryPage", async () => {
    // Given
    const refreshRequest = deferred<HistoryPage>()
    vi.mocked(fetchImportHistory)
      .mockReset()
      .mockResolvedValueOnce(emptyHistoryPage())
      .mockReturnValueOnce(refreshRequest.promise)
    const wrapper = mountHistoryPanel()
    await flushPromises()
    expect(wrapper.text()).toContain("暂无导入记录")

    // When
    await wrapper.setProps({ refreshKey: "refreshing" })

    // Then
    expect(wrapper.text()).toContain("正在加载导入记录")
    expect(wrapper.text()).not.toContain("暂无导入记录")
    wrapper.unmount()
  })

  it("showsOnlyTheErrorWhenRefreshingPreviouslyLoadedRecordsFails", async () => {
    // Given
    vi.mocked(fetchImportHistory)
      .mockReset()
      .mockResolvedValueOnce(historyPage("原有记录.xlsx"))
      .mockRejectedValueOnce(new ApiError("NETWORK_ERROR", "导入记录刷新失败", 503))
    const wrapper = mountHistoryPanel()
    await flushPromises()
    expect(wrapper.get('[data-test="history-records"]').text()).toContain("原有记录.xlsx")

    // When
    await wrapper.setProps({ refreshKey: "failed-refresh" })
    await flushPromises()

    // Then
    expect(wrapper.text()).toContain("导入记录刷新失败")
    expect(wrapper.find('[data-test="history-records"]').exists()).toBe(false)
    wrapper.unmount()
  })
})
