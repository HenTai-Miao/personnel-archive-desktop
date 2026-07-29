# B 客户端正式晋升设计

## 背景与决定

`personnel-archive-desktop-b` 已完成登录页和现有业务页的 B 系列改版，并继续使用既有 HTTP、IPC、安全和文件处理契约。产品现已明确决定：后续只使用 B 客户端，不再恢复或维护旧 `personnel-archive-desktop`。

本次晋升只改变客户端归属、启动入口和项目说明。Excel 解析、数据库写入、重复判断、导出和权限仍由 `personnel-archive-service` 负责，不能复制到 Electron。

## 采用方案

保留目录名 `personnel-archive-desktop-b` 作为唯一客户端目录，不重命名为旧目录，也不建立软链接或双份镜像。

选择这一方案的原因：

- 与产品明确指定的 B 项目名称一致；
- 保留 B 仓库现有 Git 历史，不引入目录搬迁风险；
- 消除“旧版和 B 版哪个才是默认”的双源问题；
- 后续开发、测试和打包目标可以唯一确定。

不采用的方案：

- 将 B 重命名为 `personnel-archive-desktop`：会破坏已有路径、说明和本地脚本，并隐藏本次产品决定。
- 同时保留两个客户端或创建软链接：会继续产生改错仓库、构建错版本和功能漂移风险。

## 根目录与启动入口

根目录的正式结构为：

```text
personnel-archive/
├── 启动本地测试.command
├── personnel-archive-desktop-b/
└── personnel-archive-service/
```

现有 `Codex启动B版预览.command` 升级为 `启动本地测试.command`，不再保留带“预览”含义的第二入口。脚本使用自身目录解析项目路径，避免写死用户目录。

启动流程：

1. 只使用已经存在的本地 MySQL 容器或 3306 服务；不得创建、重置或删除数据库卷。
2. MySQL 未就绪时给出明确提示；在可安全识别已有 `local-mysql` 容器时允许启动该容器。
3. 使用 Java 21 和后端 `local` profile 启动 `personnel-archive-service`，等待 8080 就绪。
4. 启动 `personnel-archive-desktop-b` 的 Electron 开发客户端。
5. 后端启动失败时展示安全日志尾部，不输出本地配置中的密码或令牌。

## 文档与工程边界

同步更新：

- 根 `AGENTS.md`：B 改为当前唯一客户端，删除“独立副本、尚未晋升”和旧目录结构。
- 根 `CODE_GUIDE.md`：只描述 B 客户端与服务端，移除不存在的旧客户端模块和启动流程。
- B `AGENTS.md`：删除“isolated copy”和“sibling remains packaged source”，将构建、打包和本机测试约束改为正式客户端语义。
- 服务端说明继续把后端定义为唯一 Excel/数据库业务边界；启动脚本引用改为新的根入口。

固定产品名不变：系统仍叫“人员信息档案管理系统”，桌面显示名仍叫“人员档案助手”，Windows 可执行文件仍为 `PersonnelArchive.exe`。

## 验证与完成标准

- `zsh -n ../启动本地测试.command` 通过，脚本只引用 B 和 service 目录。
- B 目录执行 `pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build` 全部通过。
- 在 Codex macOS Seatbelt 中不启动 Electron E2E；正常桌面会话通过根脚本进行人工启动。
- 全仓搜索不再把旧客户端描述为当前、默认或打包来源。
- 后续桌面端修改和提交只发生在 `personnel-archive-desktop-b`；服务端业务变化仍提交到 `personnel-archive-service`。

## 非目标

- 不重新设计 B 页面。
- 不修改 API、数据库 schema 或导入业务规则。
- 不恢复、复制或迁移已不存在的旧客户端目录。
- 不更改固定产品名、应用标识或安装包约定。
