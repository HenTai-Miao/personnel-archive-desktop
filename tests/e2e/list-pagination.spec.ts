/** 列表分页 Electron 端到端测试：登录后翻到第二页并只看到该页的档案。 */
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { _electron as electron, expect, test } from "@playwright/test"

function person(index: number) {
  return {
    id: String(index),
    employeeNo: `E-${String(index).padStart(3, "0")}`,
    name: `分页人员${String(index).padStart(2, "0")}`,
    organization: "测试单位",
    department: "档案部",
    position: "职员",
    titleOrSkill: "",
    updatedAt: "2026-07-22T03:00:00Z",
  }
}

test("shows 20 personnel rows per page and loads the next server page", async () => {
  // Given
  const userDataDirectory = await mkdtemp(join(tmpdir(), "personnel-archive-pagination-e2e-"))
  try {
    const application = await electron.launch({
      args: [".", `--user-data-dir=${userDataDirectory}`],
    })
    try {
      const page = await application.firstWindow()
      const requestedPages: string[] = []
      await page.route("http://127.0.0.1:8080/api/v1/**", async (route) => {
        const request = route.request()
        const url = new URL(request.url())
        if (url.pathname === "/api/v1/auth/login") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            json: {
              accessToken: "pagination-access-token",
              refreshToken: "pagination-refresh-token",
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
          const requestedPage = url.searchParams.get("page") ?? "0"
          requestedPages.push(requestedPage)
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            json: {
              content:
                requestedPage === "0"
                  ? Array.from({ length: 20 }, (_, index) => person(index + 1))
                  : [person(21)],
              page: Number(requestedPage),
              size: 20,
              totalElements: 21,
              totalPages: 2,
            },
          })
          return
        }
        await route.fulfill({ status: 404, contentType: "application/json", body: "{}" })
      })
      await page.getByPlaceholder("请输入用户名").fill("admin")
      await page.getByPlaceholder("请输入密码").fill("test-password")
      await page.getByRole("button", { name: "登录" }).click()
      await expect(page.getByText("分页人员20", { exact: true })).toBeVisible()
      await expect(page.getByText("分页人员21", { exact: true })).toHaveCount(0)

      // When
      await page.locator(".person-list-card .el-pagination .btn-next").click()

      // Then
      await expect(page.getByText("分页人员21", { exact: true })).toBeVisible()
      await expect(page.getByText("分页人员01", { exact: true })).toHaveCount(0)
      await expect(page.locator('[data-test="list-pagination"]')).toContainText(
        "每页 20 条，共 21 条",
      )
      expect(requestedPages).toEqual(["0", "1"])
    } finally {
      await application.close()
    }
  } finally {
    await rm(userDataDirectory, { recursive: true, force: true })
  }
})
