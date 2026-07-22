/**
 * Electron 主进程入口：创建受限窗口、装配 IPC，并区分本地开发页面与打包页面。
 * 业务状态不放在这里，避免 renderer 绕过 HTTP API 或文件安全边界。
 */
import { join } from "node:path"
import { app, BrowserWindow, dialog } from "electron"
import { registerIpcHandlers } from "./ipc"
import { cleanupExpiredWorkbooks } from "./temp-files"

function createWindow(iconPath: string): void {
  // 这些选项共同构成 renderer 的沙箱边界，调整任一项都需要重新做 Electron 安全审查。
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1080,
    minHeight: 680,
    show: false,
    autoHideMenuBar: true,
    title: "人员档案助手",
    icon: iconPath,
    webPreferences: {
      preload: join(__dirname, "../preload/index.cjs"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
    },
  })
  registerIpcHandlers(window)
  // 当前产品没有外部网页流程，因此同时禁止新窗口和离开当前应用页面的导航。
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }))
  window.webContents.on("will-navigate", (event, targetUrl) => {
    if (targetUrl !== window.webContents.getURL()) event.preventDefault()
  })
  window.once("ready-to-show", () => window.show())
  // 开发地址也只接受 loopback HTTP，防止环境变量把特权窗口指向远端页面。
  const developmentUrl = safeDevelopmentUrl(process.env["ELECTRON_RENDERER_URL"])
  if (!app.isPackaged && developmentUrl !== null) {
    void window.loadURL(developmentUrl)
  } else {
    void window.loadFile(join(__dirname, "../renderer/index.html"))
  }
}

function safeDevelopmentUrl(input: string | undefined): string | null {
  if (input === undefined) return null
  const parsed = URL.parse(input)
  if (parsed === null || parsed.protocol !== "http:") return null
  if (parsed.hostname !== "127.0.0.1" && parsed.hostname !== "localhost") return null
  return parsed.toString()
}

async function startApplication(): Promise<void> {
  app.setAppUserModelId("cn.internal.personnelarchive")
  // 安装包把运行时 PNG 放在 resources；开发环境则直接读取版本化的图标源文件。
  const iconPath = app.isPackaged
    ? join(process.resourcesPath, "icon.png")
    : join(app.getAppPath(), "build/icon.png")
  if (process.platform === "darwin") app.dock?.setIcon(iconPath)
  // 上次生成的档案可能包含敏感信息，启动时先按保留期做尽力清理。
  await cleanupExpiredWorkbooks()
  createWindow(iconPath)
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow(iconPath)
  })
}

function handleStartupError(error: unknown): void {
  const message = error instanceof Error ? error.message : "未知启动错误"
  dialog.showErrorBox("人员档案助手无法启动", message)
  app.quit()
}

void app.whenReady().then(startApplication).catch(handleStartupError)

app.on("window-all-closed", () => app.quit())
