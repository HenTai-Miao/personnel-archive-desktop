import { describe, expect, it } from "vitest"
import {
  assertElectronE2eLaunchAllowed,
  ElectronE2eLaunchBlockedError,
} from "../support/electron-e2e-launch-policy"

describe("Electron E2E launch policy", () => {
  it("blocks Electron before launch when Codex runs inside the macOS Seatbelt sandbox", () => {
    // Given: the exact host values captured from the crashing Playwright process.
    const context = { platform: "darwin", sandboxMode: "seatbelt" }

    // When: the E2E runner checks whether it may create the Electron GUI process.
    const launchCheck = (): void => assertElectronE2eLaunchAllowed(context)

    // Then: it reports a controlled test-environment error instead of spawning Electron.
    expect(launchCheck).toThrowError(ElectronE2eLaunchBlockedError)
  })

  it("allows Electron launch on a normal macOS desktop session", () => {
    // Given: macOS without the Codex Seatbelt marker.
    const context = { platform: "darwin", sandboxMode: undefined }

    // When/Then: the E2E runner accepts the normal desktop environment.
    expect(() => assertElectronE2eLaunchAllowed(context)).not.toThrow()
  })
})
