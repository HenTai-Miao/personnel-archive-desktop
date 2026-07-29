/** 生产环境回归测试：Windows 安装包必须使用服务器地址，不能带入本机回环地址。 */
import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import { loadEnv } from "vite"
import { describe, expect, it } from "vitest"
import { z } from "zod"

const packageSchema = z.object({
  scripts: z.record(z.string(), z.string()),
})

describe("production API environment", () => {
  it("builds Windows packages with the explicit prod endpoint", async () => {
    const projectRoot = resolve(import.meta.dirname, "../..")
    const packageJson = packageSchema.parse(
      JSON.parse(await readFile(resolve(projectRoot, "package.json"), "utf8")),
    )
    const inheritedBaseUrl = process.env["VITE_API_BASE_URL"]
    const inheritedOrigin = process.env["VITE_API_ORIGIN"]
    delete process.env["VITE_API_BASE_URL"]
    delete process.env["VITE_API_ORIGIN"]

    try {
      const environment = loadEnv("prod", projectRoot, "")
      expect(environment["VITE_API_BASE_URL"]).toBe("http://10.141.29.96:18080/api/v1")
      expect(environment["VITE_API_ORIGIN"]).toBe("http://10.141.29.96:18080")
      expect(packageJson.scripts["build:prod"]).toBe(
        "pnpm typecheck && electron-vite build --mode prod",
      )
      expect(packageJson.scripts["build:win"]).toBe(
        "pnpm build:prod && electron-builder --win nsis",
      )
    } finally {
      restoreEnvironment("VITE_API_BASE_URL", inheritedBaseUrl)
      restoreEnvironment("VITE_API_ORIGIN", inheritedOrigin)
    }
  })
})

function restoreEnvironment(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name]
    return
  }
  process.env[name] = value
}
