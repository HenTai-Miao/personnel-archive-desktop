# B Client Promotion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `personnel-archive-desktop-b` 正式设为人员档案系统唯一桌面客户端，使根启动入口、工程说明、测试和构建全部只指向 B 项目。

**Architecture:** 根 `启动本地测试.command` 只负责安全编排现有本地 MySQL、Spring Boot 服务和 B Electron 客户端；Excel 解析、导入、数据库和权限仍完全保留在 `personnel-archive-service`。B 仓库通过一个执行根启动器 `--check` 模式的行为测试锁定客户端选择，不复制后端规则，也不恢复旧客户端目录。

**Tech Stack:** zsh、Electron、Vue 3、TypeScript 5.9、Vitest 3、pnpm、Spring Boot 4、Java 21、MySQL

## Global Constraints

- `personnel-archive-desktop-b` 是唯一桌面客户端目录；不得恢复 `personnel-archive-desktop`，不得创建软链接或双份镜像。
- 固定产品名、应用标识和安装产物保持不变：`人员档案助手`、`PersonnelArchive.exe`、`PersonnelArchive-Setup.exe`。
- 启动器只能启动已经存在的 `local-mysql` 容器或已监听 3306 的 MySQL；不得创建、重置、删除容器或数据卷。
- 启动器使用脚本相对路径，不写死某位用户的项目绝对路径，不自动安装依赖，不输出密码、令牌或本地配置正文。
- 后端仍是 Excel、数据库、重复判断、导出和权限的唯一业务权威；本次不改变 API、schema 或导入规则。
- 根目录没有 Git 仓库；B 和 service 各自提交所属文件，根启动器与根说明保留在共享项目目录中。
- 当前 B 项目已经位于专用分支 `codex/b-series-redesign`；不得在 `main/master` 上实施。
- macOS Seatbelt 中不启动 Electron E2E；只运行语法、单元、类型、构建校验，真实 GUI 由正常桌面会话通过根启动器检查。

---

### Task 1: 用行为测试锁定根启动入口选择 B

**Files:**
- Create: `tests/unit/root-launcher-promotion.test.ts`
- Create: `../启动本地测试.command`
- Delete: `../Codex启动B版预览.command`

**Interfaces:**
- Consumes: 根启动器的 `--check` 参数。
- Produces: 退出码 `0` 和可读的预检输出，其中桌面端目录精确指向 `personnel-archive-desktop-b`；普通运行模式启动 service 后打开 B Electron 开发客户端。

- [x] **Step 1: 确认 B 基线测试通过**

运行：

```bash
pnpm test
```

预期：现有 Vitest 全部通过；若基线失败，先停止并报告，不把既有失败归因于本次晋升。

- [x] **Step 2: 写入失败的根启动器行为测试**

新增 `tests/unit/root-launcher-promotion.test.ts`，通过 `node:child_process.spawnSync` 真实执行：

```bash
zsh ../启动本地测试.command --check
```

测试从 `import.meta.url` 独立推导共享项目根目录，断言：

- 进程正常退出；
- 输出的“桌面端目录”精确等于共享根下的 `personnel-archive-desktop-b`；
- 输出的“后端目录”精确等于共享根下的 `personnel-archive-service`；
- 输出包含“启动入口检查通过”。

测试验证可观察行为，不读取或匹配脚本源码。

- [x] **Step 3: 运行聚焦测试并确认 RED**

运行：

```bash
./node_modules/.bin/vitest run tests/unit/root-launcher-promotion.test.ts --reporter=verbose --no-color
```

预期：测试因正式 `启动本地测试.command` 尚不存在而失败，证明它能捕获根入口缺失/选错。

- [x] **Step 4: 写入最小安全启动器实现**

用 `apply_patch` 创建根 `启动本地测试.command`：

- 通过 `${0:A:h}` 计算 `SCRIPT_DIR`；
- 派生 B 和 service 目录并检查必要入口存在；
- `--check` 只做静态预检和输出，不启动网络、容器或进程；
- 普通模式解析 Java 21，检查 3306；必要时只识别并启动现有 `local-mysql`；
- 后端未就绪时以 `local` profile 启动，日志写入 `/private/tmp/personnel-archive-service.log`，等待 18080 API 响应；
- 后端就绪后从 B 目录 `exec electron-vite dev`；
- 缺少 Java、MySQL、依赖或服务启动失败时显示明确中文错误。

随后用 `apply_patch` 删除 `Codex启动B版预览.command`，并赋予新入口可执行权限。

- [x] **Step 5: 运行聚焦测试并确认 GREEN**

运行：

```bash
zsh -n ../启动本地测试.command
./node_modules/.bin/vitest run tests/unit/root-launcher-promotion.test.ts --reporter=verbose --no-color
```

预期：脚本语法和启动入口行为测试都通过。

### Task 2: 将工程知识库切换为唯一 B 客户端

**Files:**
- Modify: `AGENTS.md`
- Modify: `../AGENTS.md`
- Modify: `../CODE_GUIDE.md`
- Modify: `../personnel-archive-service/AGENTS.md`

**Interfaces:**
- Produces: 所有工程说明只把 B 列为当前桌面端；启动流程与实际根入口一致；旧客户端实现不再作为当前模块或对照流程出现。

- [x] **Step 1: 更新 B 客户端说明**

在 B `AGENTS.md` 中：

- 将“isolated redesign copy”改为正式唯一客户端；
- 删除 sibling old client 与“尚未晋升”说明；
- 将本机测试改为根启动器直接启动 B；
- 保留固定技术包名、B 视觉契约、安全边界和现有功能状态。

- [x] **Step 2: 更新根项目状态和目录结构**

在根 `AGENTS.md` 中：

- 将 B 改为当前唯一客户端；
- 根启动器说明改为 service + B 开发客户端；
- 目录树只列正式启动器、B、service；
- 删除“独立副本、尚未替换当前打包源”等过期描述。

- [x] **Step 3: 收敛 CODE_GUIDE 客户端源图**

在根 `CODE_GUIDE.md` 中：

- 适用项目只列 B 和 service；
- 根启动流程指向 B；
- 将原独立的 B 模块表合并为唯一客户端模块表；
- 删除 Avue、旧 workbench、旧 Dock/preview 以及“当前打包源 vs B 副本”的双轨流程；
- 保留 B 的 `AppShell`、`PersonRecordIndex`、`use-archive-dossier`、连续卷宗、全宽家庭查询/批量导入等真实结构；
- 自动扫描说明只保留 B 的真实状态：`UNCONFIGURED` 不提示，目录丢失和实际错误仍提示。

- [x] **Step 4: 对齐服务端本机测试说明**

更新 service `AGENTS.md` 的根启动器说明，使其准确描述“现有 MySQL + local service + B Electron 客户端”，不声称创建容器、验证凭据或打开旧客户端。

- [x] **Step 5: 搜索残留双轨描述**

运行：

```bash
rg -n -P 'personnel-archive-desktop(?!-b)|尚未晋升|尚未替换|独立副本|B 副本|当前打包源|current packaged|Codex启动B版预览' ../AGENTS.md ../CODE_GUIDE.md AGENTS.md ../personnel-archive-service/AGENTS.md
```

预期：没有把旧客户端当作现行/默认/打包源的命中；固定技术包名 `personnel-archive-desktop` 在 B `AGENTS.md` 中允许保留一次。

### Task 3: 完整验证晋升结果

**Files:**
- Verify only: `package.json`
- Verify only: `electron-builder.yml`
- Verify only: `src/**`
- Verify only: `tests/**`

- [x] **Step 1: 验证根目录和启动器状态**

运行：

```bash
test -x ../启动本地测试.command
test ! -e ../Codex启动B版预览.command
test ! -e ../personnel-archive-desktop
zsh -n ../启动本地测试.command
../启动本地测试.command --check
```

预期：只有正式根入口和 B 客户端存在，预检输出指向 B 与 service。

- [x] **Step 2: 运行 B 全套非 GUI 校验**

运行：

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

预期：全部退出码为 `0`；不在 Seatbelt 中运行 `pnpm test:e2e`。

- [x] **Step 3: 检查差异质量和固定品牌**

运行：

```bash
git diff --check
rg -n '人员档案助手|PersonnelArchive\.exe|PersonnelArchive-Setup\.exe' package.json electron-builder.yml src/main
git status --short
git -C ../personnel-archive-service status --short
```

预期：无空白错误；产品名与执行文件未改；service 的本地配置仍未被暂存。

### Task 4: 提交晋升检查点并交付启动方法

**Files:**
- Commit in B: `AGENTS.md`, `tests/unit/root-launcher-promotion.test.ts`, plan/spec documents as applicable
- Commit in service: `AGENTS.md` only when changed
- Root shared files remain outside Git: `../启动本地测试.command`, `../AGENTS.md`, `../CODE_GUIDE.md`

- [x] **Step 1: 提交 B 晋升改动**

只暂存本计划范围内的 B 文件，确认 diff 后提交：

```bash
git add AGENTS.md tests/unit/root-launcher-promotion.test.ts docs/superpowers/plans/2026-07-29-b-client-promotion.md
git commit -m "chore(desktop): promote B client as canonical"
```

- [x] **Step 2: 提交 service 文档对齐**

只暂存 service `AGENTS.md`，绝不暂存 `config/application-local.yml`：

```bash
git -C ../personnel-archive-service add AGENTS.md
git -C ../personnel-archive-service commit -m "docs(service): align canonical B launcher"
```

- [x] **Step 3: 最终状态复核与交付**

记录两个仓库提交号、完整校验结果和根目录非 Git 文件状态。向用户返回正常桌面会话中的启动方式：双击根 `启动本地测试.command`，或在终端执行其绝对路径；说明本次未在 Seatbelt 内强行启动 Electron GUI。
