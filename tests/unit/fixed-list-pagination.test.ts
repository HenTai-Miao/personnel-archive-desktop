/** 统一分页控件测试：固定 20 条策略始终可见，并对外使用零基页码。 */
import { mount } from "@vue/test-utils"
import { describe, expect, it } from "vitest"
import { defineComponent } from "vue"
import FixedListPagination from "@/shared/components/FixedListPagination.vue"

const paginationStub = defineComponent({
  name: "ElPagination",
  props: {
    currentPage: { type: Number, required: true },
    pageSize: { type: Number, required: true },
    total: { type: Number, required: true },
  },
  emits: ["current-change"],
  template: '<button data-test="next" @click="$emit(\'current-change\', 2)">下一页</button>',
})

describe("FixedListPagination", () => {
  it("shows the fixed 20-row policy for a single page", () => {
    // Given
    const wrapper = mount(FixedListPagination, {
      props: { page: 0, total: 3 },
      global: { stubs: { ElPagination: paginationStub } },
    })

    // When
    const pagination = wrapper.getComponent(paginationStub)

    // Then
    expect(wrapper.text()).toContain("每页 20 条")
    expect(pagination.props("currentPage")).toBe(1)
    expect(pagination.props("pageSize")).toBe(20)
    expect(pagination.props("total")).toBe(3)
  })

  it("emits a zero-based page after the user changes pages", async () => {
    // Given
    const wrapper = mount(FixedListPagination, {
      props: { page: 0, total: 21 },
      global: { stubs: { ElPagination: paginationStub } },
    })

    // When
    await wrapper.get('[data-test="next"]').trigger("click")

    // Then
    expect(wrapper.emitted("change")).toEqual([[1]])
  })
})
