/** 完整档案 Electron 端到端测试：显式激活卷宗、敏感字段读取和独立详情路由。 */
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { _electron as electron, expect, test } from "@playwright/test"
import {
  E2E_PERSON_DETAIL,
  E2E_PERSON_LIST_ITEM,
  ONE_PIXEL_PNG,
} from "../support/e2e-person-fixture"

test("reads a masked dossier at the B-series desk before opening its detail route", async () => {
  const userDataDirectory = await mkdtemp(join(tmpdir(), "personnel-archive-detail-e2e-"))
  try {
    const application = await electron.launch({
      args: [".", `--user-data-dir=${userDataDirectory}`],
    })
    try {
      const page = await application.firstWindow()
      await page.setViewportSize({ width: 1440, height: 960 })
      const pageErrors: string[] = []
      const requestFailures: string[] = []
      const sensitiveValueRequests: string[] = []
      let detailRequests = 0
      page.on("pageerror", (error) => pageErrors.push(error.message))
      page.on("requestfailed", (request) =>
        requestFailures.push(
          `${request.method()} ${request.url()} ${request.failure()?.errorText ?? ""}`,
        ),
      )
      await page.route("http://127.0.0.1:8080/api/v1/**", async (route) => {
        const request = route.request()
        const url = new URL(request.url())
        const path = url.pathname
        if (path === "/api/v1/auth/login") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            json: {
              accessToken: "e2e-access-token",
              refreshToken: "e2e-refresh-token",
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
          detailRequests += 1
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            json: E2E_PERSON_DETAIL,
          })
          return
        }
        if (path === "/api/v1/persons/7/sensitive-value") {
          const field = url.searchParams.get("field")
          sensitiveValueRequests.push(field ?? "missing-field")
          const value = field === "IDENTITY_CARD" ? "123456789012345678" : "13800138000"
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            headers: { "Cache-Control": "no-store" },
            json: { value },
          })
          return
        }
        if (path === "/api/v1/persons/7/photo") {
          await route.fulfill({ status: 200, contentType: "image/png", body: ONE_PIXEL_PNG })
          return
        }
        await route.fulfill({ status: 404, contentType: "application/json", body: "{}" })
      })

      await page.getByPlaceholder("请输入用户名").fill("admin")
      await page.getByPlaceholder("请输入密码").fill("test-password")
      await page.getByRole("button", { name: "登录" }).click()

      const readingLayout = page.locator(".person-reading-layout")
      const dossierSheet = page.locator(".person-dossier-stage .dossier-reading-sheet")
      await expect(readingLayout).toBeVisible()
      await expect(page.locator(".dossier-selection-empty")).toContainText("请选择卷宗")
      expect(detailRequests).toBe(0)
      expect(sensitiveValueRequests).toEqual([])

      await page.locator('[data-test="activate-person-7"]').click()

      await expect(dossierSheet.getByRole("heading", { name: "测试甲", level: 1 })).toBeVisible()
      await expect(dossierSheet.getByText("1234***********678", { exact: true })).toBeVisible()
      await expect(dossierSheet.getByText("1380****000", { exact: true })).toBeVisible()
      await expect(dossierSheet.getByText("全日制大学", { exact: true })).toBeVisible()
      await expect(dossierSheet.getByText("覆盖版本", { exact: true })).toBeVisible()
      await expect(dossierSheet.getByText("测试奖励", { exact: true })).toBeVisible()
      await expect(dossierSheet.getByAltText("测试甲的档案照片")).toHaveAttribute("src", /^blob:/)
      await expect(page.locator(".person-reading-layout .dossier-outline")).toBeVisible()
      expect(detailRequests).toBe(1)
      expect(sensitiveValueRequests).toEqual([])

      await dossierSheet.getByRole("button", { name: "显示完整身份证号码" }).click()
      await expect(dossierSheet.getByText("123456789012345678", { exact: true })).toBeVisible()
      await dossierSheet.getByRole("button", { name: "隐藏完整身份证号码" }).click()
      await expect(dossierSheet.getByText("123456789012345678", { exact: true })).toHaveCount(0)
      await dossierSheet.getByRole("button", { name: "显示完整手机号码" }).click()
      await expect(dossierSheet.getByText("13800138000", { exact: true })).toBeVisible()
      expect(sensitiveValueRequests).toEqual(["IDENTITY_CARD", "PHONE_NUMBER"])

      const listUrl = page.url()
      await page
        .locator(".person-reading-layout .dossier-outline")
        .getByRole("button", { name: /学历与教育/ })
        .click()
      await expect(page.locator("#education")).toBeInViewport()
      expect(page.url()).toBe(listUrl)

      await dossierSheet.getByRole("button", { name: "独立查看" }).click()
      await expect(page).toHaveURL(/#\/persons\/7$/)
      await expect(page.locator(".detail-reading-layout .dossier-reading-sheet")).toBeVisible()
      await expect(page.getByRole("heading", { name: "基本情况与任职信息" })).toBeVisible()
      await expect(page.getByText("1234***********678", { exact: true })).toBeVisible()
      await expect(page.getByText("13800138000", { exact: true })).toHaveCount(0)
      expect(detailRequests).toBe(2)
      expect(pageErrors).toEqual([])
      expect(requestFailures).toEqual([])
    } finally {
      await application.close()
    }
  } finally {
    await rm(userDataDirectory, { recursive: true, force: true })
  }
})
