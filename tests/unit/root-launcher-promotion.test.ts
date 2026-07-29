/** 根启动器契约：预检必须选择正式 B 客户端与同级 Java 服务。 */
import { spawnSync } from "node:child_process"
import { join, resolve } from "node:path"
import { describe, expect, it } from "vitest"

const workspaceRoot = resolve(process.cwd(), "..")
const launcherPath = join(workspaceRoot, "启动本地测试.command")

describe("root local-test launcher", () => {
  it("preflights the canonical B client and service directories", () => {
    const result = spawnSync("/bin/zsh", [launcherPath, "--check"], {
      encoding: "utf8",
    })

    expect(result.error).toBeUndefined()
    expect({ status: result.status, stderr: result.stderr }).toEqual({ status: 0, stderr: "" })
    expect(result.stdout).toContain(
      `桌面端目录：${join(workspaceRoot, "personnel-archive-desktop-b")}\n`,
    )
    expect(result.stdout).toContain(
      `后端目录：${join(workspaceRoot, "personnel-archive-service")}\n`,
    )
    expect(result.stdout).toContain("后端 API：http://127.0.0.1:18080/api/v1\n")
    expect(result.stdout).toContain("启动入口检查通过\n")
  })
})
