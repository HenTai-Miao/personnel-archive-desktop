import { mount } from "@vue/test-utils"
import ElementPlus from "element-plus"
import { createPinia } from "pinia"
import { describe, expect, it } from "vitest"
import { createMemoryHistory, createRouter } from "vue-router"
import LoginPage from "@/features/auth/LoginPage.vue"

describe("LoginPage B dossier identity", () => {
  it("uses the B identity and login dossier without invented metrics", async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/login", component: LoginPage },
        { path: "/persons", name: "person-list", component: { template: "<div />" } },
      ],
    })
    await router.push("/login")
    await router.isReady()

    const wrapper = mount(LoginPage, {
      global: { plugins: [createPinia(), router, ElementPlus] },
    })

    expect(wrapper.find(".login-dossier-layout").exists()).toBe(true)
    expect(wrapper.get(".login-system-identity").text()).toContain("人员信息档案管理系统")
    expect(wrapper.get(".login-dossier-card").text()).toContain("用户登录")
    expect(wrapper.text()).toContain("敏感字段默认遮罩")
    expect(wrapper.text()).not.toMatch(/\d+\s*份档案/)
    wrapper.unmount()
  })
})
