import { defineConfig } from "@playwright/test"
import { assertElectronE2eLaunchAllowed } from "./tests/support/electron-e2e-launch-policy"

// macOS aborts Electron in AppKit when a Playwright launch inherits Codex's Seatbelt sandbox.
assertElectronE2eLaunchAllowed({
  platform: process.platform,
  sandboxMode: process.env["CODEX_SANDBOX"],
})

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  retries: 0,
  workers: 1,
})
