/** 应用外壳组件测试：验证导航、用户信息和紧邻姓名的退出操作。 */
import { mount } from "@vue/test-utils"
import ElementPlus from "element-plus"
import { createPinia, setActivePinia } from "pinia"
import { describe, expect, it } from "vitest"
import { createMemoryHistory, createRouter } from "vue-router"
import { useAuthStore } from "@/features/auth/store"
import { userSchema } from "@/shared/api/schemas"
import AppShell from "@/shared/components/AppShell.vue"

describe("AppShell Windows management layout", () => {
  it("keeps the brand and user actions together in the top system bar", async () => {
    // Given
    const pinia = createPinia()
    setActivePinia(pinia)
    const auth = useAuthStore()
    Object.defineProperty(window, "personnelArchive", {
      configurable: true,
      value: {
        scanPendingWorkbooks: async () => ({
          state: "UNCONFIGURED",
          message: "未设置",
          workbooks: [],
        }),
      },
    })
    auth.user = userSchema.parse({
      id: "1",
      username: "admin",
      displayName: "本地测试管理员",
      roles: ["ADMIN"],
    })
    const emptyPage = { template: "<div />" } as const
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/", component: emptyPage },
        { path: "/persons", component: emptyPage },
        { path: "/search", component: emptyPage },
        { path: "/import", component: emptyPage },
        { path: "/settings", component: emptyPage },
      ],
    })
    await router.push("/")
    await router.isReady()

    // When
    const wrapper = mount(AppShell, { global: { plugins: [pinia, router, ElementPlus] } })

    // Then
    const systemBar = wrapper.get(".system-bar")
    const nameRow = wrapper.get(".user-name-row")
    const displayName = nameRow.get("strong")
    const logout = nameRow.get("button.logout-button")
    expect(systemBar.find(".brand-block").exists()).toBe(true)
    expect(systemBar.find(".nav-foot").exists()).toBe(true)
    expect(wrapper.get(".archive-nav").find(".brand-block").exists()).toBe(false)
    expect(displayName.text()).toBe("本地测试管理员")
    expect(displayName.element.nextElementSibling).toBe(logout.element)
    expect(wrapper.findAll("nav a").map((link) => link.text())).toContain("文件夹设置")
    wrapper.unmount()
  })
})
