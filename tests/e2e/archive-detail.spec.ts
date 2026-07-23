/** 完整档案 Electron 端到端测试：登录、点击查看并读取所有分区与照片。 */
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { _electron as electron, expect, test } from "@playwright/test"

const detailResponse = {
  id: "7",
  employeeNo: "E-001",
  name: "测试甲",
  identityCardMasked: "1234***********678",
  personal: {
    gender: "女",
    birthDate: "2000-01-01",
    nation: "汉族",
    nativePlace: "湖南长沙",
    birthPlace: "湖南长沙",
    politicalStatus: "中共党员",
    politicalJoinDate: "2021-07-01",
    maritalStatus: "已婚",
    healthStatus: "健康",
    mailingAddress: "测试地址",
    postalCode: "410000",
    phoneNumberMasked: "1380****000",
  },
  employment: {
    organization: "测试单位",
    department: "测试部门",
    workStartDate: "2020-01-01",
    dispatchedToBiddingCompanyDate: "2021-01-01",
    position: "测试职务",
    titleOrSkill: "测试技能",
    titleOrSkillAcquiredDate: "2022-01-01",
  },
  education: {
    fullTime: {
      institutionName: "全日制大学",
      departmentAndMajor: "档案学",
      educationLevel: "本科",
      degreeName: "学士",
    },
    inService: {
      institutionName: "在职大学",
      departmentAndMajor: "管理学",
      educationLevel: "研究生",
      degreeName: "硕士",
    },
  },
  mainEducation: [{ sortOrder: 1, leftText: "2020.09-2024.06", rightText: "示例大学" }],
  workExperiences: [{ sortOrder: 1, leftText: "2024.07-至今", rightText: "覆盖版本" }],
  rewardsPunishments: [{ sortOrder: 1, leftText: "2025.01", rightText: "测试奖励" }],
  familyMembers: [
    {
      name: "测试乙",
      relationship: "子女",
      birthDate: "2000-07-23",
      age: 25,
      politicalStatus: "群众",
      organizationAndPosition: "测试单位及职务",
    },
  ],
  declaration: { signer: "测试甲", date: "2026-07-22" },
  photo: {
    mimeType: "image/png",
    originalFilename: "fixture.png",
    byteSize: 68,
    widthPixels: 1,
    heightPixels: 1,
  },
  archive: { templateVersion: "V1", snapshotVersion: 2, updatedAt: "2026-07-22T03:00:00Z" },
} as const

test("previews a masked dossier before opening the complete archive", async () => {
  // Given
  const userDataDirectory = await mkdtemp(join(tmpdir(), "personnel-archive-detail-e2e-"))
  try {
    const application = await electron.launch({
      args: [".", `--user-data-dir=${userDataDirectory}`],
    })
    try {
      const page = await application.firstWindow()
      const pageErrors: string[] = []
      const requestFailures: string[] = []
      const sensitiveValueRequests: string[] = []
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
              content: [
                {
                  id: "7",
                  employeeNo: "E-001",
                  name: "测试甲",
                  organization: "测试单位",
                  department: "测试部门",
                  position: "测试职务",
                  titleOrSkill: "测试技能",
                  updatedAt: "2026-07-22T03:00:00Z",
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
        if (path === "/api/v1/persons/7") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            json: detailResponse,
          })
          return
        }
        if (path === "/api/v1/persons/7/sensitive-value") {
          const field = url.searchParams.get("field")
          sensitiveValueRequests.push(field ?? "missing-field")
          switch (field) {
            case "IDENTITY_CARD":
              await route.fulfill({
                status: 200,
                contentType: "application/json",
                headers: { "Cache-Control": "no-store" },
                json: { value: "123456789012345678" },
              })
              return
            case "PHONE_NUMBER":
              await route.fulfill({
                status: 200,
                contentType: "application/json",
                headers: { "Cache-Control": "no-store" },
                json: { value: "13800138000" },
              })
              return
            default:
              await route.fulfill({ status: 400, contentType: "application/json", body: "{}" })
              return
          }
        }
        if (path === "/api/v1/persons/7/photo") {
          const png = Buffer.from(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
            "base64",
          )
          await route.fulfill({ status: 200, contentType: "image/png", body: png })
          return
        }
        await route.fulfill({ status: 404, contentType: "application/json", body: "{}" })
      })

      // When
      await page.getByPlaceholder("请输入用户名").fill("admin")
      await page.getByPlaceholder("请输入密码").fill("test-password")
      await page.getByRole("button", { name: "登录" }).click()
      await page.getByRole("button", { name: "预览", exact: true }).click()

      // Then
      const preview = page.locator('[data-test="person-preview"]')
      await expect(preview.getByRole("heading", { name: "测试甲", level: 2 })).toBeVisible()
      await expect(preview.getByText("1234***********678", { exact: true })).toBeVisible()
      await expect(preview.getByText("1380****000", { exact: true })).toBeVisible()
      await expect(preview.getByAltText("测试甲的档案照片")).toHaveAttribute("src", /^blob:/)
      await expect(preview.getByRole("button", { name: /显示完整/ })).toHaveCount(0)
      expect(sensitiveValueRequests).toEqual([])

      await preview.getByRole("button", { name: "查看完整档案" }).click()
      await expect(page.getByRole("heading", { name: "测试甲", level: 1 })).toBeVisible()
      await expect(page.getByRole("heading", { name: "基本情况与任职信息" })).toBeVisible()
      await expect(page.getByText("全日制大学", { exact: true })).toBeVisible()
      await expect(page.getByText("覆盖版本", { exact: true })).toBeVisible()
      await expect(page.getByText("测试奖励", { exact: true })).toBeVisible()
      await expect(page.getByText("群众", { exact: true })).toBeVisible()
      await expect(page.getByText("1234***********678", { exact: true })).toBeVisible()
      await expect(page.getByText("1380****000", { exact: true })).toBeVisible()
      await page.getByRole("button", { name: "显示完整身份证号码" }).click()
      await expect(page.getByText("123456789012345678", { exact: true })).toBeVisible()
      await page.getByRole("button", { name: "隐藏完整身份证号码" }).click()
      await expect(page.getByText("123456789012345678", { exact: true })).toHaveCount(0)
      await page.getByRole("button", { name: "显示完整手机号码" }).click()
      await expect(page.getByText("13800138000", { exact: true })).toBeVisible()
      await expect(page.getByAltText("测试甲的档案照片")).toHaveAttribute("src", /^blob:/)
      const detailUrl = page.url()
      await page.getByRole("button", { name: "学历教育", exact: true }).click()
      expect(page.url()).toBe(detailUrl)
      expect(pageErrors).toEqual([])
      expect(requestFailures).toEqual([])
    } finally {
      await application.close()
    }
  } finally {
    await rm(userDataDirectory, { recursive: true, force: true })
  }
})
