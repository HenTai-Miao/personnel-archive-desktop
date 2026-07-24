import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

function readStyle(relativePath: string): string {
  return readFileSync(resolve("src/renderer/src/styles/archive-workbench", relativePath), "utf8")
}

describe("archive workbench layout styles", () => {
  it("animates the dossier preview and list as a right-side drawer", () => {
    // When
    const lists = readStyle("lists.css")
    const preview = readStyle("preview.css")

    // Then
    expect(lists).toMatch(/grid-template-columns:\s*minmax\(0, 1fr\) auto/)
    expect(lists).toMatch(/\.person-workbench\.is-preview-open[\s\S]*column-gap:\s*18px/)
    expect(preview).toContain("width: var(--person-preview-width)")
    expect(preview).toMatch(/\.dossier-preview-enter-from[\s\S]*translateX/)
    expect(preview).toMatch(/\.dossier-preview-leave-to[\s\S]*translateX/)
    expect(preview).toContain("220ms")
    expect(preview).toMatch(
      /@media \(max-width: 1280px\)[\s\S]*person-preview-resizer[\s\S]*display:\s*none/,
    )
  })
})
