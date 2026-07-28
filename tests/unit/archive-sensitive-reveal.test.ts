/** 详情页敏感值读取测试：点击显示后才调用单字段接口，基础详情不携带完整值。 */
import { flushPromises, mount } from "@vue/test-utils"
import ElementPlus from "element-plus"
import { afterEach, describe, expect, it, vi } from "vitest"
import { createMemoryHistory, createRouter } from "vue-router"
import ArchiveDetailPage from "@/features/archive-view/ArchiveDetailPage.vue"
import { PERSON_DETAIL_FIXTURE } from "../support/person-detail-fixture"

const apiMocks = vi.hoisted(() => ({
  getPerson: vi.fn(),
  downloadPersonPhoto: vi.fn(),
  revealSensitiveValue: vi.fn(),
}))

vi.mock("@/features/archive-view/api", () => apiMocks)
vi.mock("@/features/archive-view/open-archive", () => ({
  downloadAndOpenArchive: vi.fn(),
}))

afterEach(() => {
  vi.restoreAllMocks()
})

describe("ArchiveDetailPage sensitive reveal", () => {
  it("requests and displays the selected full value after an explicit click", async () => {
    // Given
    apiMocks.getPerson.mockResolvedValue(PERSON_DETAIL_FIXTURE)
    apiMocks.revealSensitiveValue.mockResolvedValue({ value: "123456789012345678" })
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/persons", component: { template: "<div />" } },
        { path: "/persons/:personId", name: "person-detail", component: ArchiveDetailPage },
      ],
    })
    await router.push("/persons/7")
    await router.isReady()
    const wrapper = mount(ArchiveDetailPage, {
      global: { plugins: [router, ElementPlus] },
    })
    await flushPromises()

    // When
    await wrapper.get('button[aria-label="显示完整身份证号码"]').trigger("click")
    await flushPromises()

    // Then
    expect(apiMocks.revealSensitiveValue).toHaveBeenCalledWith("7", "IDENTITY_CARD")
    expect(wrapper.find(".dossier-reading-sheet").exists()).toBe(true)
    expect(wrapper.text()).toContain("123456789012345678")
    expect(wrapper.get('button[aria-label="隐藏完整身份证号码"]')).toBeTruthy()
    wrapper.unmount()
  })
})
