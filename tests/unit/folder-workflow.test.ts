/** 本地文件夹工作流测试：用真实临时目录验证扫描、去重和不覆盖归档。 */
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { FolderWorkflow } from "../../src/main/folder-workflow"
import { folderSettingsSchema } from "../../src/shared/ipc-contract"

const temporaryDirectories: string[] = []
const workbookBytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x01])

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  )
})

async function createWorkflowFixture(archiveExists = true) {
  const root = await mkdtemp(join(tmpdir(), "personnel-folder-workflow-"))
  temporaryDirectories.push(root)
  const pendingDirectory = join(root, "pending")
  const archiveDirectory = join(root, "archive")
  await mkdir(pendingDirectory)
  if (archiveExists) await mkdir(archiveDirectory)
  const settings = folderSettingsSchema.parse({ pendingDirectory, archiveDirectory })
  return {
    pendingDirectory,
    archiveDirectory,
    workflow: new FolderWorkflow(async () => settings),
  }
}

describe("FolderWorkflow", () => {
  it("queues only direct valid workbooks once when the pending folder is scanned", async () => {
    // Given
    const fixture = await createWorkflowFixture()
    await writeFile(join(fixture.pendingDirectory, "档案甲.xlsx"), workbookBytes)
    await writeFile(join(fixture.pendingDirectory, "~$档案甲.xlsx"), workbookBytes)
    await writeFile(join(fixture.pendingDirectory, "伪装.xlsx"), new Uint8Array([1, 2, 3, 4]))
    await mkdir(join(fixture.pendingDirectory, "nested"))
    await writeFile(join(fixture.pendingDirectory, "nested", "档案乙.xlsx"), workbookBytes)

    // When
    const first = await fixture.workflow.scan(100)
    const second = await fixture.workflow.scan(100)

    // Then
    expect(first.state).toBe("READY")
    expect(first.workbooks.map((workbook) => workbook.name)).toEqual(["档案甲.xlsx"])
    expect(second.workbooks).toEqual([])
  })

  it("creates the archive folder and removes the source after a successful archive", async () => {
    // Given
    const fixture = await createWorkflowFixture(false)
    const source = join(fixture.pendingDirectory, "档案甲.xlsx")
    await writeFile(source, workbookBytes)
    const scan = await fixture.workflow.scan(1)
    const workbook = scan.workbooks[0]
    expect(workbook).toBeDefined()

    // When
    const result = await fixture.workflow.archive(workbook?.token ?? "")

    // Then
    expect(result).toEqual({ status: "MOVED", archivedName: "档案甲.xlsx" })
    await expect(access(source)).rejects.toThrow()
    expect(await readFile(join(fixture.archiveDirectory, "档案甲.xlsx"))).toEqual(
      Buffer.from(workbookBytes),
    )
  })

  it("adds a sequence suffix instead of overwriting an existing archive", async () => {
    // Given
    const fixture = await createWorkflowFixture()
    const existingBytes = new Uint8Array([9, 9, 9])
    await writeFile(join(fixture.archiveDirectory, "档案甲.xlsx"), existingBytes)
    await writeFile(join(fixture.pendingDirectory, "档案甲.xlsx"), workbookBytes)
    const scan = await fixture.workflow.scan(1)
    const workbook = scan.workbooks[0]
    expect(workbook).toBeDefined()

    // When
    const result = await fixture.workflow.archive(workbook?.token ?? "")

    // Then
    expect(result).toEqual({ status: "MOVED", archivedName: "档案甲 (1).xlsx" })
    expect(await readFile(join(fixture.archiveDirectory, "档案甲.xlsx"))).toEqual(
      Buffer.from(existingBytes),
    )
    expect(await readFile(join(fixture.archiveDirectory, "档案甲 (1).xlsx"))).toEqual(
      Buffer.from(workbookBytes),
    )
  })

  it("keeps the source when the archive destination cannot be created", async () => {
    // Given
    const fixture = await createWorkflowFixture(false)
    const source = join(fixture.pendingDirectory, "档案甲.xlsx")
    await writeFile(source, workbookBytes)
    await writeFile(fixture.archiveDirectory, new Uint8Array([1]))
    const scan = await fixture.workflow.scan(1)
    const workbook = scan.workbooks[0]
    expect(workbook).toBeDefined()

    // When
    const result = await fixture.workflow.archive(workbook?.token ?? "")

    // Then
    expect(result.status).toBe("FAILED")
    expect(await readFile(source)).toEqual(Buffer.from(workbookBytes))
  })
})
