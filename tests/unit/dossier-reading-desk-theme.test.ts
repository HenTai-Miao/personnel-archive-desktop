import { afterEach, describe, expect, it } from "vitest"
import "@/src/styles.css"

afterEach(() => {
  document.body.innerHTML = ""
})

describe("B dossier reading desk computed styles", () => {
  it("applies the approved paper, blue, and shell layout to real elements", () => {
    document.body.innerHTML = `
      <div class="reading-desk-shell">
        <header class="reading-desk-topbar"></header>
        <aside class="reading-desk-sidebar"></aside>
        <main class="reading-desk-workspace"></main>
      </div>
    `
    const shellElement = document.querySelector<HTMLElement>(".reading-desk-shell")
    const workspaceElement = document.querySelector<HTMLElement>(".reading-desk-workspace")
    if (shellElement === null || workspaceElement === null) {
      throw new Error("B reading desk fixture did not render")
    }

    const root = getComputedStyle(document.documentElement)
    const shell = getComputedStyle(shellElement)
    const workspace = getComputedStyle(workspaceElement)

    expect(root.getPropertyValue("--dossier-primary").trim()).toBe("#034ed6")
    expect(root.getPropertyValue("--dossier-ink").trim()).toBe("#141928")
    expect(shell.display).toBe("grid")
    expect(workspace.overflow).toBe("auto")
  })

  it("keeps the dialog close control inside the paper header", () => {
    document.body.innerHTML = `
      <div class="el-dialog">
        <header class="el-dialog__header show-close">
          <span class="el-dialog__title">发现重复档案</span>
          <button class="el-dialog__headerbtn"><span class="el-dialog__close">×</span></button>
        </header>
      </div>
    `
    const header = document.querySelector<HTMLElement>(".el-dialog__header")
    const close = document.querySelector<HTMLElement>(".el-dialog__headerbtn")
    if (header === null || close === null) throw new Error("弹窗关闭按钮样式夹具未渲染")

    const headerStyle = getComputedStyle(header)
    const closeStyle = getComputedStyle(close)

    expect(headerStyle.paddingRight).toBe("64px")
    expect(closeStyle.width).toBe("32px")
    expect(closeStyle.height).toBe("32px")
    expect(closeStyle.top).toBe("16px")
    expect(closeStyle.right).toBe("16px")
  })
})
