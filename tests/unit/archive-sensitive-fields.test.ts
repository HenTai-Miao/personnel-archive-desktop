/** 敏感字段展示测试：默认脱敏，完整值仅在明确点击后短暂显示并可再次隐藏。 */
import { mount } from "@vue/test-utils"
import ElementPlus from "element-plus"
import { describe, expect, it } from "vitest"
import ArchiveIdentitySheet from "@/features/archive-view/ArchiveIdentitySheet.vue"
import type { SensitiveField } from "@/features/archive-view/schemas"
import { PERSON_DETAIL_FIXTURE } from "../support/person-detail-fixture"

const hiddenValues: Readonly<Record<SensitiveField, string>> = {
  IDENTITY_CARD: "",
  PHONE_NUMBER: "",
}

describe("ArchiveIdentitySheet sensitive fields", () => {
  it("shows masked values and requests only the clicked field", async () => {
    // Given
    const wrapper = mountIdentity(hiddenValues)

    // When
    await wrapper.get('button[aria-label="显示完整身份证号码"]').trigger("click")

    // Then
    expect(wrapper.text()).toContain("1234***********678")
    expect(wrapper.text()).toContain("1380****000")
    expect(wrapper.text()).not.toContain("123456789012345678")
    expect(wrapper.emitted("toggleSensitive")).toEqual([["IDENTITY_CARD"]])
  })

  it("shows revealed values and requests hiding the selected field", async () => {
    // Given
    const wrapper = mountIdentity({
      IDENTITY_CARD: "123456789012345678",
      PHONE_NUMBER: "13800138000",
    })

    // When
    await wrapper.get('button[aria-label="隐藏完整手机号码"]').trigger("click")

    // Then
    expect(wrapper.text()).toContain("123456789012345678")
    expect(wrapper.text()).toContain("13800138000")
    expect(wrapper.emitted("toggleSensitive")).toEqual([["PHONE_NUMBER"]])
  })
})

function mountIdentity(sensitiveValues: Readonly<Record<SensitiveField, string>>) {
  return mount(ArchiveIdentitySheet, {
    props: {
      person: PERSON_DETAIL_FIXTURE,
      photoUrl: "",
      photoLoading: false,
      photoError: "",
      sensitiveValues,
      sensitiveLoading: null,
      sensitiveError: "",
    },
    global: { plugins: [ElementPlus] },
  })
}
