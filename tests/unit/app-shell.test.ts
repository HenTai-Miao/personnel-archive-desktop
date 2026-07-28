/** 应用外壳组件测试：验证导航、用户信息和紧邻姓名的退出操作。 */
import { mount } from "@vue/test-utils"
import ElementPlus from "element-plus"
import { createPinia, setActivePinia } from "pinia"
import { describe, expect, it } from "vitest"
import { createMemoryHistory, createRouter } from "vue-router"
import { useAuthStore } from "@/features/auth/store"
import { userSchema } from "@/shared/api/schemas"
import AppShell from "@/shared/components/AppShell.vue"

describe("AppShell B dossier reading desk", () => {
  it("presents task context, secure session state, role, and business directory", async () => {
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
    const topbar = wrapper.get(".reading-desk-topbar")
    const userArea = wrapper.get(".reading-desk-user-area")
    const displayName = userArea.get(".user-identity strong")
    const logout = userArea.get("button.logout-button")
    expect(topbar.find(".system-identity").exists()).toBe(true)
    expect(wrapper.get(".reading-desk-context-nav").text()).toContain("卷宗检阅")
    expect(wrapper.get(".reading-desk-context-nav").text()).toContain("批处理")
    expect(wrapper.get(".session-chip").text()).toContain("安全会话已建立")
    expect(wrapper.get(".user-role").text()).toBe("ADMIN")
    expect(wrapper.get(".reading-desk-sidebar").text()).toContain("业务目录")
    expect(wrapper.find(".sidebar-security-note").exists()).toBe(false)
    expect(wrapper.text()).not.toContain("卷宗已安全载入")
    expect(wrapper.text()).not.toContain("敏感字段默认遮罩")
    expect(wrapper.get(".system-identity").text()).toContain("人员档案助手")
    expect(wrapper.find(".reading-desk-workspace").exists()).toBe(true)
    expect(displayName.text()).toBe("本地测试管理员")
    expect(logout.text()).toBe("退出")
    expect(wrapper.findAll("nav a").map((link) => link.text())).not.toContain("文件夹设置")
    wrapper.unmount()
  })
})
