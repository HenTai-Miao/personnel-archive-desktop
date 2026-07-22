# 人员档案助手

技术项目名为 `personnel-archive-desktop`。Windows 桌面客户端界面运行在受限 Electron renderer 中，所有业务数据经 `/api/v1` 访问人员档案数据服务。手动选择与文件夹扫描共用可空字段导入及重复覆盖确认流程。本机待上传/归档目录由 Electron main 管理：自动扫描文件成功导入后安全移动，手动选择文件始终保留原路径。

内部 GitLab 项目：<http://49.232.13.110:8099/personnel-archive/personnel-archive-desktop>

完整的前端文件职责、登录/导入/打开档案流程和后续优化顺序见 [`../CODE_GUIDE.md`](../CODE_GUIDE.md)。修改模块或流程时必须同步更新该导读与本目录 `AGENTS.md`。

## 本地开发

使用 Node.js 22 LTS 与 pnpm：

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

`VITE_API_BASE_URL` 必须以 `/api/v1` 结尾。`VITE_API_ORIGIN` 只用于生成 Electron 内容安全策略，必须与 API base 的 origin（协议、主机、端口）完全一致；配置不一致时构建会失败。默认仅允许 `http://127.0.0.1:8080`。

## 验证与构建

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
pnpm build:win
```

`test:e2e` 会先构建再运行 Electron 登录页 smoke test。macOS 上不要从 Codex Seatbelt 沙箱启动该命令：配置会在创建 Electron 进程前给出明确提示，避免系统误报“Electron 意外退出”；请改在普通终端运行。Windows 安装包必须在 Windows CI 验证；安装后显示名为“人员档案助手”，可执行文件为 `PersonnelArchive.exe`。

macOS 本机人工测试可先完成构建，再从仓库根目录双击 `启动本地测试.command`；脚本会在后端和管理员登录验证成功后打开 `release/mac-arm64/PersonnelArchive.app`。
