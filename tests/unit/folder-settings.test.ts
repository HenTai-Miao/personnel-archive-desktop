/** 文件夹设置存储测试：验证跨实例持久化以及危险的同目录配置会被拒绝。 */
import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import {
  FolderSettingsConflictError,
  FolderSettingsRepository,
} from "../../src/main/folder-settings"

const temporaryDirectories: string[] = []

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  )
})

describe("FolderSettingsRepository", () => {
  it("persists both selected folders across repository instances", async () => {
    // Given
    const root = await mkdtemp(join(tmpdir(), "personnel-folder-settings-"))
    temporaryDirectories.push(root)
    const settingsPath = join(root, "folder-settings.json")
    const pendingDirectory = join(root, "pending")
    const archiveDirectory = join(root, "archive")
    const repository = new FolderSettingsRepository(settingsPath)

    // When
    await repository.update("PENDING", pendingDirectory)
    await repository.update("ARCHIVE", archiveDirectory)
    const reloaded = await new FolderSettingsRepository(settingsPath).load()

    // Then
    expect(reloaded).toEqual({ pendingDirectory, archiveDirectory })
  })

  it("rejects using the pending folder as the archive folder", async () => {
    // Given
    const root = await mkdtemp(join(tmpdir(), "personnel-folder-settings-"))
    temporaryDirectories.push(root)
    const repository = new FolderSettingsRepository(join(root, "folder-settings.json"))
    await repository.update("PENDING", root)

    // When
    const action = repository.update("ARCHIVE", root)

    // Then
    await expect(action).rejects.toBeInstanceOf(FolderSettingsConflictError)
  })

  it("recovers from a corrupt settings file so the user can select both folders again", async () => {
    // Given
    const root = await mkdtemp(join(tmpdir(), "personnel-folder-settings-"))
    temporaryDirectories.push(root)
    const settingsPath = join(root, "folder-settings.json")
    await writeFile(settingsPath, "{not-json", "utf8")

    // When
    const settings = await new FolderSettingsRepository(settingsPath).load()

    // Then
    expect(settings).toEqual({ pendingDirectory: null, archiveDirectory: null })
  })
})
