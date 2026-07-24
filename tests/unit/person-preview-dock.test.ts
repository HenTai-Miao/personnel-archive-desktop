import { mount } from "@vue/test-utils"
import ElementPlus from "element-plus"
import { describe, expect, it } from "vitest"
import PersonPreviewDock from "@/features/person-list/PersonPreviewDock.vue"
import type { PersonPreviewState } from "@/features/person-list/use-person-preview"
import { personIdSchema } from "@/shared/api/schemas"

const LOADING_PREVIEW: PersonPreviewState = {
  kind: "loading",
  personId: personIdSchema.parse("7"),
}

function mountDock() {
  return mount(PersonPreviewDock, {
    props: { state: LOADING_PREVIEW, openingPersonId: null },
    global: { plugins: [ElementPlus] },
  })
}

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

  it.each([
    { clientX: -1000, expectedWidth: "520" },
    { clientX: 1000, expectedWidth: "280" },
  ])("clamps pointer resizing at $expectedWidth pixels", async ({ clientX, expectedWidth }) => {
    // Given
    const wrapper = mountDock()
    const separator = wrapper.get('[data-test="person-preview-resizer"]')
    await separator.trigger("pointerdown", { pointerId: 1, clientX: 500 })

    // When
    await separator.trigger("pointermove", { pointerId: 1, clientX })

    // Then
    expect(separator.attributes("aria-valuenow")).toBe(expectedWidth)
    wrapper.unmount()
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
