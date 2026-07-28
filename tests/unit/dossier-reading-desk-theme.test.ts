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
})
