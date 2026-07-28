import { mount } from "@vue/test-utils"
import { afterEach, describe, expect, it, vi } from "vitest"
import DossierOutline from "@/shared/components/DossierOutline.vue"

afterEach(() => {
  vi.restoreAllMocks()
})

describe("DossierOutline", () => {
  it("marks and scrolls to the selected real dossier section", async () => {
    const section = document.createElement("section")
    section.id = "identity"
    const scrollIntoView = vi.fn()
    section.scrollIntoView = scrollIntoView
    document.body.append(section)
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: () => ({ matches: false }),
    })
    const wrapper = mount(DossierOutline, {
      props: {
        title: "卷宗目录",
        sections: [{ id: "identity", label: "基本情况与任职", code: "01" }],
      },
    })

    await wrapper.get('button[data-section="identity"]').trigger("click")

    expect(wrapper.get('button[data-section="identity"]').attributes("aria-current")).toBe(
      "location",
    )
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" })
    wrapper.unmount()
    section.remove()
  })
})
