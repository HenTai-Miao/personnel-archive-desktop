/** 档案删除 Electron 端到端测试：从管理员列表确认原因、提交软删除并刷新为空目录。 */
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { _electron as electron, expect, test } from "@playwright/test"
import { E2E_PERSON_DETAIL } from "../support/e2e-person-fixture"

test("deletes an imported archive with the recommended reason", async () => {
  const userDataDirectory = await mkdtemp(join(tmpdir(), "personnel-archive-deletion-e2e-"))
  try {
    const application = await electron.launch({
      args: [".", `--user-data-dir=${userDataDirectory}`],
    })
    try {
      const page = await application.firstWindow()
      const pageErrors: string[] = []
      const submittedReasons: unknown[] = []
      let active = true
      page.on("pageerror", (error) => pageErrors.push(error.message))
      await page.route("http://127.0.0.1:8080/api/v1/**", async (route) => {
        const request = route.request()
        const url = new URL(request.url())
        if (url.pathname === "/api/v1/auth/login") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            json: {
              accessToken: "deletion-access-token",
              refreshToken: "deletion-refresh-token",
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
              content: active
                ? [
                    {
                      id: "7",
                      employeeNo: "E-007",
                      name: "误导入测试档案",
                      organization: "测试单位",
                      department: "档案部",
                      position: "档案员",
                      titleOrSkill: "馆员",
                      updatedAt: "2026-07-22T03:00:00Z",
                    },
                  ]
                : [],
              page: 0,
              size: 20,
              totalElements: active ? 1 : 0,
              totalPages: active ? 1 : 0,
            },
          })
          return
        }
        if (url.pathname === "/api/v1/persons/7" && request.method() === "GET") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            json: {
              ...E2E_PERSON_DETAIL,
              employeeNo: "E-007",
              name: "误导入测试档案",
              photo: null,
            },
          })
          return
        }
        if (url.pathname === "/api/v1/persons/7/deletion" && request.method() === "POST") {
          submittedReasons.push(request.postDataJSON())
          active = false
          await route.fulfill({ status: 204, body: "" })
          return
        }
        await route.fulfill({ status: 404, contentType: "application/json", body: "{}" })
      })

      await page.getByPlaceholder("请输入用户名").fill("admin")
      await page.getByPlaceholder("请输入密码").fill("test-password")
      await page.getByRole("button", { name: "登录" }).click()
      await expect(page.getByText("误导入测试档案", { exact: true })).toBeVisible()
      await page.locator('[data-test="activate-person-7"]').click()
      await expect(page.locator(".dossier-reading-sheet")).toBeVisible()

      await page.getByRole("button", { name: "删除", exact: true }).click()
      const dialog = page.getByRole("dialog", { name: "删除档案" })
      await expect(dialog).toBeVisible()
      await expect(dialog.getByLabel("删除原因（必填）")).toHaveValue("误导入")
      await dialog.getByRole("button", { name: "确认删除", exact: true }).click()

      await expect(page.getByText("档案已删除", { exact: true })).toBeVisible()
      await expect(page.getByText("误导入测试档案", { exact: true })).toHaveCount(0)
      await expect(page.getByText("当前页没有档案", { exact: true }).first()).toBeVisible()
      expect(submittedReasons).toEqual([{ reason: "误导入" }])
      expect(pageErrors).toEqual([])
    } finally {
      await application.close()
    }
  } finally {
    await rm(userDataDirectory, { recursive: true, force: true })
  }
})
