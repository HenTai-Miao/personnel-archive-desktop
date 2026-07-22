/** 应用图标回归测试：防止打包配置或运行时窗口退回 Electron 默认图标。 */
import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import { z } from "zod"

const packageSchema = z.object({
  build: z.object({
    directories: z.object({ buildResources: z.string() }),
    extraResources: z.array(z.object({ from: z.string(), to: z.string() })),
    win: z.object({ icon: z.string() }),
    mac: z.object({ icon: z.string() }),
    linux: z.object({ icon: z.string() }),
  }),
})

describe("desktop application icon", () => {
  it("packages branded icon resources for every supported desktop surface", async () => {
    // Given
    const projectRoot = resolve(import.meta.dirname, "../..")
    const packageJson = packageSchema.parse(
      JSON.parse(await readFile(resolve(projectRoot, "package.json"), "utf8")),
    )

    // When
    const [png, ico, icns] = await Promise.all([
      readFile(resolve(projectRoot, "build/icon.png")),
      readFile(resolve(projectRoot, "build/icon.ico")),
      readFile(resolve(projectRoot, "build/icon.icns")),
    ])

    // Then
    expect(packageJson.build.directories.buildResources).toBe("build")
    expect(packageJson.build.extraResources).toContainEqual({
      from: "build/icon.png",
      to: "icon.png",
    })
    expect(packageJson.build.win.icon).toBe("build/icon.ico")
    expect(packageJson.build.mac.icon).toBe("build/icon.icns")
    expect(packageJson.build.linux.icon).toBe("build/icon.png")
    expect(png.subarray(1, 4).toString("ascii")).toBe("PNG")
    expect(png.readUInt32BE(16)).toBe(1024)
    expect(png.readUInt32BE(20)).toBe(1024)
    expect([...ico.subarray(0, 4)]).toEqual([0, 0, 1, 0])
    expect(icns.subarray(0, 4).toString("ascii")).toBe("icns")
  })
})
