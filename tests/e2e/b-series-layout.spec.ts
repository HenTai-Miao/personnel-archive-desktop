/** B 系列视觉验收：桌面三栏、窄窗目录切换和全部业务页共用视觉语言。 */
import { mkdir, mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { _electron as electron, expect, type Page, test } from "@playwright/test"
import {
  E2E_PERSON_DETAIL,
  E2E_PERSON_LIST_ITEM,
  ONE_PIXEL_PNG,
} from "../support/e2e-person-fixture"

const OUTPUT_DIRECTORY = join(process.cwd(), "output", "b-series")

async function capture(page: Page, fileName: string): Promise<void> {
  await page.screenshot({
    path: join(OUTPUT_DIRECTORY, fileName),
    animations: "disabled",
  })
}

async function expectWorkspaceHasNoHorizontalOverflow(page: Page): Promise<void> {
  const workspace = page.locator(".reading-desk-workspace")
  await expect(workspace).toBeVisible()
  expect(await workspace.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
    true,
  )
}

test("renders B-series layouts at desktop and narrow widths", async () => {
  test.setTimeout(60_000)
  await mkdir(OUTPUT_DIRECTORY, { recursive: true })
  const userDataDirectory = await mkdtemp(join(tmpdir(), "personnel-archive-b-series-e2e-"))
  try {
    const application = await electron.launch({
      args: [".", `--user-data-dir=${userDataDirectory}`],
    })
    try {
      const page = await application.firstWindow()
      await page.setViewportSize({ width: 1440, height: 960 })
      const pageErrors: string[] = []
      page.on("pageerror", (error) => pageErrors.push(error.message))
      await page.route("http://127.0.0.1:8080/api/v1/**", async (route) => {
        const request = route.request()
        const url = new URL(request.url())
        const path = url.pathname
        if (path === "/api/v1/auth/login") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            json: {
              accessToken: "layout-access-token",
              refreshToken: "layout-refresh-token",
              expiresIn: 900,
              user: { id: "1", username: "admin", displayName: "测试管理员", roles: ["ADMIN"] },
            },
          })
          return
        }
        if (path === "/api/v1/persons" && request.method() === "GET") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            json: {
              content: [E2E_PERSON_LIST_ITEM],
              page: 0,
              size: 20,
              totalElements: 1,
              totalPages: 1,
            },
          })
          return
        }
        if (path === "/api/v1/persons/7" && request.method() === "GET") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            json: E2E_PERSON_DETAIL,
          })
          return
        }
        if (path === "/api/v1/persons/7/photo") {
          await route.fulfill({ status: 200, contentType: "image/png", body: ONE_PIXEL_PNG })
          return
        }
        if (path === "/api/v1/family-members/search") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            json: {
              content: [
                {
                  personId: "7",
                  personName: "测试甲",
                  organization: "测试单位",
                  department: "测试部门",
                  position: "测试职务",
                  titleOrSkill: "测试技能",
                  matchedMemberName: "测试乙",
                  relationship: "子女",
                },
                {
                  personId: "8",
                  personName: "测试丙",
                  organization: "第二测试单位",
                  department: "综合部",
                  position: "职员",
                  titleOrSkill: "工程师",
                  matchedMemberName: "测试乙",
                  relationship: "配偶",
                },
              ],
              page: 0,
              size: 20,
              totalElements: 2,
              totalPages: 1,
            },
          })
          return
        }
        if (path === "/api/v1/imports/history") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            json: {
              content: [
                {
                  itemId: "31",
                  batchId: "12",
                  operatorName: "测试管理员",
                  fileName: "测试档案工作簿.xlsx",
                  status: "IMPORTED",
                  code: "IMPORTED",
                  message: "导入成功",
                  processedAt: "2026-07-23T01:02:03Z",
                },
              ],
              page: 0,
              size: 20,
              totalElements: 1,
              totalPages: 1,
            },
          })
          return
        }
        await route.fulfill({ status: 404, contentType: "application/json", body: "{}" })
      })

      await expect(page.locator(".login-dossier-layout")).toBeVisible()
      await capture(page, "login-1440.png")
      await page.getByPlaceholder("请输入用户名").fill("admin")
      await page.getByPlaceholder("请输入密码").fill("test-password")
      await page.getByRole("button", { name: "登录" }).click()

      await expect(page.locator(".reading-desk-topbar")).toBeVisible()
      await expect(page.locator(".reading-desk-sidebar")).toBeVisible()
      await expect(page.locator(".person-reading-layout")).toBeVisible()
      await expect(page.locator(".dossier-selection-empty")).toContainText("请选择卷宗")
      await capture(page, "personnel-empty-1440.png")

      const topbarHeight = await page
        .locator(".reading-desk-topbar")
        .evaluate((element) => element.getBoundingClientRect().height)
      const sidebarWidth = await page
        .locator(".reading-desk-sidebar")
        .evaluate((element) => element.getBoundingClientRect().width)
      const desktopColumns = await page.locator(".person-reading-layout").evaluate((element) => {
        const view = element.ownerDocument.defaultView
        if (view === null) throw new TypeError("reading desk has no browser view")
        return view
          .getComputedStyle(element)
          .gridTemplateColumns.split(" ")
          .map((value: string) => Number.parseFloat(value))
      })
      expect(Math.round(topbarHeight)).toBe(60)
      expect(Math.round(sidebarWidth)).toBe(252)
      expect(Math.round(desktopColumns[0] ?? 0)).toBe(286)
      expect(Math.round(desktopColumns[2] ?? 0)).toBe(238)

      await page.locator('[data-test="activate-person-7"]').click()
      await expect(page.locator(".dossier-reading-sheet")).toBeVisible()
      await expect(page.locator(".person-reading-layout .dossier-outline")).toBeVisible()
      await expect(page.getByText("1234***********678", { exact: true })).toBeVisible()
      await capture(page, "personnel-active-1440.png")

      await page.setViewportSize({ width: 1080, height: 800 })
      await expect(page.locator(".person-record-index")).toBeVisible()
      await expect(page.locator(".dossier-reading-sheet")).toBeVisible()
      await expect(page.locator(".person-reading-layout .dossier-outline")).toBeHidden()
      await expect(page.locator(".person-reading-layout .dossier-mobile-index")).toBeVisible()
      await capture(page, "personnel-1080.png")

      await page.setViewportSize({ width: 1440, height: 960 })
      await page.getByRole("link", { name: "家庭成员查询" }).click()
      await page.locator('[data-test="family-search-query"]').fill("测试乙")
      await page.locator('[data-test="family-search-submit"]').click()
      await expect(page.locator(".family-result-sheet")).toContainText("测试乙")
      await expect(page.locator('[data-test="family-search-results"]')).toContainText("测试丙")
      await expect(page.locator(".family-match-index")).toHaveCount(0)
      await expect(page.locator(".family-match-sheet")).toHaveCount(0)
      await capture(page, "family-search-1440.png")

      await page.setViewportSize({ width: 1080, height: 800 })
      const familyPapers = page.locator(".family-search-paper, .family-result-sheet")
      await expect(familyPapers).toHaveCount(2)
      await expect(familyPapers.nth(0)).toBeVisible()
      await expect(familyPapers.nth(1)).toBeVisible()
      const familyLeftEdges = await familyPapers.evaluateAll((elements) =>
        elements.map((element) => Math.round(element.getBoundingClientRect().left)),
      )
      expect(new Set(familyLeftEdges).size).toBe(1)
      await expectWorkspaceHasNoHorizontalOverflow(page)
      await capture(page, "family-search-1080.png")

      await page.setViewportSize({ width: 1440, height: 960 })
      await page.getByRole("link", { name: "批量导入档案" }).click()
      await expect(page.locator(".import-workflow-stack")).toBeVisible()
      await expect(page.locator(".import-picker-sheet")).toBeVisible()
      await expect(page.locator(".import-current-sheet")).toBeVisible()
      await expect(page.locator("#import-history")).toContainText("测试档案工作簿.xlsx")
      await expect(page.locator(".import-outline")).toHaveCount(0)
      await capture(page, "import-1440.png")

      await page.setViewportSize({ width: 1080, height: 800 })
      const importPapers = page.locator(
        ".import-picker-sheet, .import-current-sheet, .import-history-sheet",
      )
      await expect(importPapers).toHaveCount(3)
      await expect(importPapers.nth(0)).toBeVisible()
      await expect(importPapers.nth(1)).toBeVisible()
      await expect(importPapers.nth(2)).toBeVisible()
      const importLeftEdges = await importPapers.evaluateAll((elements) =>
        elements.map((element) => Math.round(element.getBoundingClientRect().left)),
      )
      expect(new Set(importLeftEdges).size).toBe(1)
      await expectWorkspaceHasNoHorizontalOverflow(page)
      await capture(page, "import-1080.png")

      await page.setViewportSize({ width: 1440, height: 960 })
      await page.evaluate((hash) => {
        const browser = globalThis as unknown as { location: { hash: string } }
        browser.location.hash = hash
      }, "#/settings")
      await expect(page.locator(".folder-reading-layout")).toBeVisible()
      await expect(page.locator(".folder-outline")).toContainText("安全规则")
      await capture(page, "folder-settings-1440.png")
      expect(pageErrors).toEqual([])
    } finally {
      await application.close()
    }
  } finally {
    await rm(userDataDirectory, { recursive: true, force: true })
  }
})
