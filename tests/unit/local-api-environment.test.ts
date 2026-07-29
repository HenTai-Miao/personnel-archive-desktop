/** 本地环境回归测试：开发客户端和本地后端必须使用统一的 18080 端口。 */
import { resolve } from "node:path"
import { loadEnv } from "vite"
import { describe, expect, it } from "vitest"

describe("local API environment", () => {
  it("targets the local backend on port 18080", () => {
    const projectRoot = resolve(import.meta.dirname, "../..")
    const inheritedBaseUrl = process.env["VITE_API_BASE_URL"]
    const inheritedOrigin = process.env["VITE_API_ORIGIN"]
    delete process.env["VITE_API_BASE_URL"]
    delete process.env["VITE_API_ORIGIN"]

    try {
      const environment = loadEnv("development", projectRoot, "")
      expect(environment["VITE_API_BASE_URL"]).toBe("http://127.0.0.1:18080/api/v1")
      expect(environment["VITE_API_ORIGIN"]).toBe("http://127.0.0.1:18080")
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
