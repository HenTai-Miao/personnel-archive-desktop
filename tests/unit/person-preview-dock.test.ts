import { mount } from "@vue/test-utils"
import ElementPlus from "element-plus"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import PersonPreviewDock from "@/features/person-list/PersonPreviewDock.vue"
import type { PersonPreviewState } from "@/features/person-list/use-person-preview"
import { personIdSchema } from "@/shared/api/schemas"

const LOADING_PREVIEW: PersonPreviewState = {
  kind: "loading",
  personId: personIdSchema.parse("7"),
}

let resizeCallback: ResizeObserverCallback | undefined

class ResizeObserverStub {
  constructor(callback: ResizeObserverCallback) {
    resizeCallback = callback
  }

  observe(): void {}

  disconnect(): void {}
}

function mountDock() {
  return mount(PersonPreviewDock, {
    props: { state: LOADING_PREVIEW, openingPersonId: null },
    global: { plugins: [ElementPlus] },
  })
}

function mountDockInWorkbench(initialWidth?: number) {
  let workbenchWidth = 900
  const workbench = document.createElement("div")
  workbench.className = "person-workbench"
  workbench.style.setProperty("--person-workbench-open-gap", "18px")
  Object.defineProperty(workbench, "clientWidth", { get: () => workbenchWidth })
  document.body.append(workbench)
  const wrapper = mount(PersonPreviewDock, {
    attachTo: workbench,
    props: { state: LOADING_PREVIEW, openingPersonId: null, initialWidth },
    global: { plugins: [ElementPlus] },
  })
  return {
    wrapper,
    workbench,
    setWorkbenchWidth: (width: number) => {
      workbenchWidth = width
    },
  }
}

beforeEach(() => {
  resizeCallback = undefined
  vi.stubGlobal("ResizeObserver", ResizeObserverStub)
})

afterEach(() => {
  vi.unstubAllGlobals()
  document.body.innerHTML = ""
})

describe("PersonPreviewDock", () => {
  it("increases the preview width when its separator is dragged left", async () => {
    // Given
    const wrapper = mountDock()
    const separator = wrapper.get('[data-test="person-preview-resizer"]')

    // When
    await separator.trigger("pointerdown", { pointerId: 1, clientX: 500 })
    await separator.trigger("pointermove", { pointerId: 1, clientX: 420 })

    // Then
    expect(separator.attributes("aria-valuenow")).toBe("400")
    expect(wrapper.get('[data-test="person-preview-dock"]').attributes("style")).toContain(
      "--person-preview-width: 400px",
    )
    wrapper.unmount()
  })

  it("expands past the legacy ceiling and clamps at the workbench boundary", async () => {
    // Given
    const { wrapper, workbench } = mountDockInWorkbench()
    const separator = wrapper.get('[data-test="person-preview-resizer"]')
    await separator.trigger("pointerdown", { pointerId: 1, clientX: 500 })

    // When
    await separator.trigger("pointermove", { pointerId: 1, clientX: 200 })

    // Then
    expect(separator.attributes("aria-valuenow")).toBe("620")
    expect(separator.attributes("aria-valuemax")).toBe("882")

    // When
    await separator.trigger("pointermove", { pointerId: 1, clientX: -1000 })

    // Then
    expect(separator.attributes("aria-valuenow")).toBe("882")
    wrapper.unmount()
    workbench.remove()
  })

  it("keeps its minimum width when the separator is dragged right", async () => {
    // Given
    const wrapper = mountDock()
    const separator = wrapper.get('[data-test="person-preview-resizer"]')
    await separator.trigger("pointerdown", { pointerId: 1, clientX: 500 })

    // When
    await separator.trigger("pointermove", { pointerId: 1, clientX: 1000 })

    // Then
    expect(separator.attributes("aria-valuenow")).toBe("280")
    wrapper.unmount()
  })

  it("clamps after workbench shrink without growing automatically on expansion", async () => {
    // Given
    const { wrapper, workbench, setWorkbenchWidth } = mountDockInWorkbench(800)
    const separator = wrapper.get('[data-test="person-preview-resizer"]')
    await wrapper.vm.$nextTick()
    expect(separator.attributes("aria-valuenow")).toBe("800")
    expect(separator.attributes("aria-valuemax")).toBe("882")

    // When
    setWorkbenchWidth(600)
    resizeCallback?.([], {} as ResizeObserver)
    await wrapper.vm.$nextTick()

    // Then
    expect(separator.attributes("aria-valuenow")).toBe("582")
    expect(separator.attributes("aria-valuemax")).toBe("582")

    // When
    setWorkbenchWidth(1200)
    resizeCallback?.([], {} as ResizeObserver)
    await wrapper.vm.$nextTick()

    // Then
    expect(separator.attributes("aria-valuenow")).toBe("582")
    expect(separator.attributes("aria-valuemax")).toBe("1182")
    wrapper.unmount()
    workbench.remove()
  })

  it("ends the active resize when the pointer is released", async () => {
    // Given
    const wrapper = mountDock()
    const separator = wrapper.get('[data-test="person-preview-resizer"]')
    await separator.trigger("pointerdown", { pointerId: 1, clientX: 500 })
    expect(wrapper.get('[data-test="person-preview-dock"]').classes()).toContain(
      "is-preview-resizing",
    )

    // When
    await separator.trigger("pointerup", { pointerId: 1 })

    // Then
    expect(wrapper.get('[data-test="person-preview-dock"]').classes()).not.toContain(
      "is-preview-resizing",
    )
    wrapper.unmount()
  })

  it.each([
    { key: "ArrowLeft", expectedWidth: "336" },
    { key: "ArrowRight", expectedWidth: "304" },
  ])("adjusts its width with $key", async ({ key, expectedWidth }) => {
    // Given
    const wrapper = mountDock()
    const separator = wrapper.get('[data-test="person-preview-resizer"]')

    // When
    await separator.trigger("keydown", { key })

    // Then
    expect(separator.attributes("aria-valuenow")).toBe(expectedWidth)
    wrapper.unmount()
  })
})
