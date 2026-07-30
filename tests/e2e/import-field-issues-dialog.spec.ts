/// <reference lib="dom" />

/** 字段问题弹窗 Electron 回归：遮罩必须覆盖外壳与真实表格，正文独立滚动且背景不可操作。 */
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { _electron as electron, expect, test } from "@playwright/test"

const ISSUE_MESSAGE = Array.from(
  { length: 12 },
  (_, index) => `字段 ${index + 1} 导入失败（基本情况!D${index + 1}）：请填写明确且有效的内容`,
).join("\n")

function historyItem(index: number) {
  return {
    itemId: `issue-${index}`,
    batchId: "101",
    operatorName: "测试管理员",
    fileName: `字段问题-${index}.xlsx`,
    status: "FAILED",
    code: "IMPORT_FIELD_VALIDATION_FAILED",
    message: index === 1 ? ISSUE_MESSAGE : `字段 ${index} 导入失败（基本情况!D${index}）：请修正`,
    processedAt: "2026-07-30T03:00:00Z",
  }
}

test("keeps the field issues dialog above the shell and table at the minimum window size", async () => {
  const userDataDirectory = await mkdtemp(join(tmpdir(), "personnel-archive-field-issues-e2e-"))
  try {
    const application = await electron.launch({
      args: [".", `--user-data-dir=${userDataDirectory}`],
    })
    try {
      const page = await application.firstWindow()
      await application.evaluate(({ BrowserWindow }) => {
        BrowserWindow.getAllWindows()[0]?.setBounds({ width: 1080, height: 720 })
      })
      await page.route("http://127.0.0.1:18080/api/v1/**", async (route) => {
        const request = route.request()
        const url = new URL(request.url())
        if (url.pathname === "/api/v1/auth/login") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            json: {
              accessToken: "field-issues-access-token",
              refreshToken: "field-issues-refresh-token",
              expiresIn: 900,
              user: {
                id: "1",
                username: "admin",
                displayName: "测试管理员",
                roles: ["ADMIN"],
              },
            },
          })
          return
        }
        if (url.pathname === "/api/v1/persons" && request.method() === "GET") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            json: {
              content: [],
              page: 0,
              size: 20,
              totalElements: 0,
              totalPages: 0,
            },
          })
          return
        }
        if (url.pathname === "/api/v1/imports/history" && request.method() === "GET") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            json: {
              content: Array.from({ length: 4 }, (_, index) => historyItem(index + 1)),
              page: 0,
              size: 20,
              totalElements: 4,
              totalPages: 1,
            },
          })
          return
        }
        await route.fulfill({ status: 404, contentType: "application/json", body: "{}" })
      })

      await page.getByPlaceholder("请输入用户名").fill("admin")
      await page.getByPlaceholder("请输入密码").fill("test-password")
      await page.getByRole("button", { name: "登录" }).click()
      await page.getByText("批量导入档案", { exact: true }).click()
      await expect(page.getByRole("heading", { name: "批量导入", exact: true })).toBeVisible()
      await expect(page.getByText("需修正", { exact: true })).toHaveCount(4)

      await page.locator('[data-test="show-import-field-issues"]').first().click()

      const dialog = page.getByRole("dialog", { name: "工作簿需要修正" })
      const overlay = dialog.locator(
        "xpath=ancestor::div[contains(concat(' ', normalize-space(@class), ' '), ' import-field-issues-overlay ')]",
      )
      const dialogPanel = dialog.locator(".el-dialog")
      await expect(dialog).toBeVisible()
      await expect(dialogPanel).toBeVisible()
      await expect(overlay).toHaveCount(1)
      expect(await overlay.evaluate((element) => element.parentElement === document.body)).toBe(
        true,
      )
      await expect(dialog).toContainText("字段问题-1.xlsx")
      await expect(dialog).toContainText("原文件未被修改")

      const coveredTargets = await page.evaluate(() => {
        const modalOverlay = Array.from(
          document.querySelectorAll<HTMLElement>("body > .import-field-issues-overlay"),
        ).find((element) => element.querySelector('[role="dialog"]') !== null)
        if (modalOverlay === undefined) throw new Error("未找到活动字段问题遮罩")
        const targets = [
          { selector: ".reading-desk-topbar", edge: "left" },
          { selector: ".reading-desk-sidebar", edge: "left" },
          {
            selector: ".import-history-sheet .el-table__body tr:nth-child(2) td:first-child",
            edge: "left",
          },
          {
            selector: ".import-history-sheet .el-table__body-wrapper",
            edge: "right",
          },
        ] as const
        return targets.map(({ selector, edge }) => {
          const target = document.querySelector<HTMLElement>(selector)
          if (target === null) throw new Error(`未找到遮罩目标：${selector}`)
          const rect = target.getBoundingClientRect()
          const x = edge === "right" ? rect.right - 8 : rect.left + 8
          const y = rect.top + rect.height / 2
          const hit = document.elementFromPoint(x, y)
          return {
            selector,
            covered: hit?.closest(".import-field-issues-overlay") === modalOverlay,
          }
        })
      })
      expect(coveredTargets).toEqual([
        { selector: ".reading-desk-topbar", covered: true },
        { selector: ".reading-desk-sidebar", covered: true },
        {
          selector: ".import-history-sheet .el-table__body tr:nth-child(2) td:first-child",
          covered: true,
        },
        {
          selector: ".import-history-sheet .el-table__body-wrapper",
          covered: true,
        },
      ])

      const listMetrics = await page.locator(".import-field-issues-list").evaluate((element) => ({
        clientHeight: element.clientHeight,
        scrollHeight: element.scrollHeight,
      }))
      expect(listMetrics.scrollHeight).toBeGreaterThan(listMetrics.clientHeight)

      const viewport = await page.evaluate(() => ({
        width: window.innerWidth,
        height: window.innerHeight,
      }))
      const dialogBox = await dialogPanel.boundingBox()
      const footerBox = await dialogPanel.locator(".el-dialog__footer").boundingBox()
      if (dialogBox === null || footerBox === null) {
        throw new Error("无法读取字段问题弹窗尺寸")
      }
      expect(dialogBox.x).toBeGreaterThanOrEqual(24)
      expect(dialogBox.x + dialogBox.width).toBeLessThanOrEqual(viewport.width - 24)
      expect(footerBox.y + footerBox.height).toBeLessThanOrEqual(viewport.height)

      const sidebarBox = await page.locator(".reading-desk-sidebar").boundingBox()
      if (sidebarBox === null) throw new Error("无法读取侧边栏位置")
      await page.mouse.click(sidebarBox.x + 16, sidebarBox.y + 180)
      await expect(dialog).toBeVisible()
      await expect(page.getByRole("heading", { name: "批量导入", exact: true })).toBeVisible()

      await page.locator('[data-test="close-import-field-issues"]').click()
      await expect(dialog).toBeHidden()
    } finally {
      await application.close()
    }
  } finally {
    await rm(userDataDirectory, { recursive: true, force: true })
  }
})
