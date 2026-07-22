/** Captures only the host values that decide whether Electron GUI automation is safe to start. */
export type ElectronE2eLaunchContext = {
  readonly platform: string
  readonly sandboxMode: string | undefined
}

/** Identifies a host restriction before Playwright can spawn a crashing Electron process. */
export class ElectronE2eLaunchBlockedError extends Error {
  readonly name = "ElectronE2eLaunchBlockedError"
  readonly code = "ELECTRON_E2E_BLOCKED_BY_MACOS_SEATBELT"

  constructor() {
    super(
      "macOS Codex Seatbelt 沙箱无法启动 Electron 图形进程；请在普通终端或 Windows CI 中运行 pnpm test:e2e。",
    )
  }
}

/** Fails before process creation when the current macOS host is known to abort Electron in AppKit. */
export function assertElectronE2eLaunchAllowed(context: ElectronE2eLaunchContext): void {
  if (context.platform === "darwin" && context.sandboxMode === "seatbelt") {
    throw new ElectronE2eLaunchBlockedError()
  }
}
