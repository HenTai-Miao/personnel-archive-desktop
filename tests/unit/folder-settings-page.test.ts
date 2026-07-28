/** 文件夹设置页面测试：验证已保存路径展示以及两类目录使用不同的系统选择动作。 */

import type { PersonnelArchiveBridge } from "@shared/ipc-contract"
import { flushPromises, mount } from "@vue/test-utils"
import ElementPlus, { ElInput } from "element-plus"
import { describe, expect, it, vi } from "vitest"
import FolderSettingsPage from "@/features/folder-settings/FolderSettingsPage.vue"

describe("FolderSettingsPage", () => {
  it("shows saved folders and selects the archive folder with its explicit kind", async () => {
    // Given
    const selectFolder = vi.fn<PersonnelArchiveBridge["selectFolder"]>()
    selectFolder.mockResolvedValue({
      status: "SAVED",
      settings: { pendingDirectory: "/待上传", archiveDirectory: "/已归档" },
    })
    const bridge = {
      loadFolderSettings: vi
        .fn<PersonnelArchiveBridge["loadFolderSettings"]>()
        .mockResolvedValue({ pendingDirectory: "/待上传", archiveDirectory: null }),
      selectFolder,
      selectWorkbooks: vi.fn<PersonnelArchiveBridge["selectWorkbooks"]>().mockResolvedValue([]),
      scanPendingWorkbooks: vi
        .fn<PersonnelArchiveBridge["scanPendingWorkbooks"]>()
        .mockResolvedValue({
          state: "UNCONFIGURED",
          message: "未设置",
          workbooks: [],
        }),
      archiveScannedWorkbook: vi.fn<PersonnelArchiveBridge["archiveScannedWorkbook"]>(),
      openArchive: vi.fn<PersonnelArchiveBridge["openArchive"]>(),
      saveArchiveBundle: vi.fn<PersonnelArchiveBridge["saveArchiveBundle"]>(),
      saveRefreshCredential: vi
        .fn<PersonnelArchiveBridge["saveRefreshCredential"]>()
        .mockResolvedValue(),
      loadRefreshCredential: vi
        .fn<PersonnelArchiveBridge["loadRefreshCredential"]>()
        .mockResolvedValue(null),
      clearRefreshCredential: vi
        .fn<PersonnelArchiveBridge["clearRefreshCredential"]>()
        .mockResolvedValue(),
    } satisfies PersonnelArchiveBridge
    Object.defineProperty(window, "personnelArchive", { configurable: true, value: bridge })
    const wrapper = mount(FolderSettingsPage, { global: { plugins: [ElementPlus] } })
    await flushPromises()

    expect(wrapper.find(".folder-reading-layout").exists()).toBe(true)
    expect(wrapper.find("#folder-pending").text()).toContain("待上传文件夹")
    expect(wrapper.find("#folder-archive").text()).toContain("上传完成归档文件夹")
    expect(wrapper.find(".folder-outline").text()).toContain("安全规则")

    // When
    await wrapper.get('[data-test="choose-archive-folder"]').trigger("click")
    await flushPromises()

    // Then
    expect(wrapper.findAllComponents(ElInput).map((input) => input.props("modelValue"))).toEqual([
      "/待上传",
      "/已归档",
    ])
    expect(selectFolder).toHaveBeenCalledWith("ARCHIVE")
  })
})
