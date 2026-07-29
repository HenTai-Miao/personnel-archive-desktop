/** 批量导入扫描状态提示：未配置不干扰手动导入，真实异常仍需可见。 */
import { mount } from "@vue/test-utils"
import ElementPlus from "element-plus"
import { createPinia, setActivePinia } from "pinia"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { fetchImportHistory } from "@/features/archive-import/api"
import ImportPage from "@/features/archive-import/ImportPage.vue"
import { importHistoryPageSchema } from "@/features/archive-import/schemas"
import { useImportStore } from "@/features/archive-import/store"

vi.mock("@/features/archive-import/api", () => ({
  fetchImportHistory: vi.fn(),
  submitDecision: vi.fn(),
  uploadWorkbooks: vi.fn(),
}))

function mountPage() {
  return mount(ImportPage, { global: { plugins: [ElementPlus] } })
}

describe("ImportPage automatic scan status", () => {
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

  it("does not present unconfigured automatic folders as a manual import warning", () => {
    const store = useImportStore()
    store.scanState = "UNCONFIGURED"
    store.scanMessage = "请先设置待上传文件夹和归档文件夹"

    const wrapper = mountPage()

    expect(wrapper.text()).not.toContain("请先设置待上传文件夹和归档文件夹")
    expect(wrapper.get(".import-picker-sheet").text()).toContain("选择文件")
    wrapper.unmount()
  })

  it("keeps a real automatic scan failure visible", () => {
    const store = useImportStore()
    store.scanState = "FAILED"
    store.scanMessage = "无法读取待上传文件夹"

    const wrapper = mountPage()

    expect(wrapper.text()).toContain("无法读取待上传文件夹")
    expect(wrapper.find(".import-alert .el-alert--warning").exists()).toBe(true)
    wrapper.unmount()
  })

  it("keeps a ready automatic scan status visible as information", () => {
    const store = useImportStore()
    store.scanState = "READY"
    store.scanMessage = "已扫描待上传文件夹"

    const wrapper = mountPage()

    expect(wrapper.text()).toContain("已扫描待上传文件夹")
    expect(wrapper.find(".import-alert .el-alert--info").exists()).toBe(true)
    wrapper.unmount()
  })
})
