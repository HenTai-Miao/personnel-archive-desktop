/** 档案删除弹窗测试：锁定默认原因、必填校验、成功通知与并发缺失分支。 */
import { DOMWrapper, flushPromises, mount } from "@vue/test-utils"
import ElementPlus from "element-plus"
import { afterEach, describe, expect, it, vi } from "vitest"
import { deletePerson } from "@/features/person-list/api"
import PersonDeleteAction from "@/features/person-list/PersonDeleteAction.vue"
import { ApiError } from "@/shared/api/error"
import { personIdSchema } from "@/shared/api/schemas"

const PERSON_ID = personIdSchema.parse("7")

vi.mock("@/features/person-list/api", () => ({
  deletePerson: vi.fn(),
}))

afterEach(() => {
  vi.clearAllMocks()
  document.body.innerHTML = ""
})

function mountAction() {
  return mount(PersonDeleteAction, {
    attachTo: document.body,
    props: { personId: PERSON_ID, personName: "测试甲" },
    global: { plugins: [ElementPlus] },
  })
}

async function openDialog() {
  const wrapper = mountAction()
  await wrapper.get('[data-test="person-delete-trigger"]').trigger("click")
  await wrapper.vm.$nextTick()
  return { wrapper, body: new DOMWrapper(document.body) }
}

describe("PersonDeleteAction", () => {
  it("opens with the recommended reason and requires nonblank text", async () => {
    const { wrapper, body } = await openDialog()
    const reason = body.get('[data-test="person-delete-reason"]')

    expect((reason.element as HTMLTextAreaElement).value).toBe("误导入")
    await reason.setValue("   ")
    expect(body.get('[data-test="person-delete-confirm"]').attributes("disabled")).toBeDefined()
    expect(deletePerson).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it("deletes with a trimmed reason and emits the deleted person id", async () => {
    vi.mocked(deletePerson).mockResolvedValue(undefined)
    const { wrapper, body } = await openDialog()
    await body.get('[data-test="person-delete-reason"]').setValue("  误导入  ")

    await body.get('[data-test="person-delete-confirm"]').trigger("click")
    await flushPromises()

    expect(deletePerson).toHaveBeenCalledWith(PERSON_ID, "误导入")
    expect(wrapper.emitted("deleted")).toEqual([[PERSON_ID]])
    wrapper.unmount()
  })

  it("emits missing when another operator already deleted the archive", async () => {
    vi.mocked(deletePerson).mockRejectedValue(new ApiError("NOT_FOUND", "档案不存在或已删除", 404))
    const { wrapper, body } = await openDialog()

    await body.get('[data-test="person-delete-confirm"]').trigger("click")
    await flushPromises()

    expect(wrapper.emitted("missing")).toEqual([[PERSON_ID]])
    expect(body.get('[data-test="person-delete-dialog"]').isVisible()).toBe(false)
    wrapper.unmount()
  })

  it("keeps retryable errors inside the dialog", async () => {
    vi.mocked(deletePerson).mockRejectedValue(new ApiError("INTERNAL_ERROR", "系统处理失败", 500))
    const { wrapper, body } = await openDialog()

    await body.get('[data-test="person-delete-confirm"]').trigger("click")
    await flushPromises()

    expect(body.get('[data-test="person-delete-error"]').text()).toContain("系统处理失败")
    expect(wrapper.emitted("deleted")).toBeUndefined()
    wrapper.unmount()
  })
})
