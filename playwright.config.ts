import { readdirSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { defineConfig } from "@playwright/test"
import { assertElectronE2eRendererBundleAllowed } from "./tests/support/e2e-api-route-policy"
import { assertElectronE2eLaunchAllowed } from "./tests/support/electron-e2e-launch-policy"

// macOS aborts Electron in AppKit when a Playwright launch inherits Codex's Seatbelt sandbox.
assertElectronE2eLaunchAllowed({
  platform: process.platform,
  sandboxMode: process.env["CODEX_SANDBOX"],
})

const rendererAssetsDirectory = resolve(process.cwd(), "out/renderer/assets")
const rendererBundleSource = readdirSync(rendererAssetsDirectory, { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith(".js"))
  .map((entry) => readFileSync(resolve(rendererAssetsDirectory, entry.name), "utf8"))
  .join("\n")
assertElectronE2eRendererBundleAllowed(rendererBundleSource)

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  retries: 0,
  workers: 1,
})
