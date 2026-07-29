# B 版隐藏跳过工作簿提示 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在重复档案选择 `SKIP` 成功后清空页面级临时消息，同时保留逐项 `SKIPPED` 状态、永久历史和覆盖成功提示。

**Architecture:** 继续由 `archive-import/store.ts` 的 `decide` 动作统一处理重复决定结果；只改变成功分支写入 `message` 的规则，不改组件、API 或后端。回归测试通过真实 Pinia store 和现有 API 边界 mock 验证用户可观察的消息与条目状态。

**Tech Stack:** Vue 3、Pinia 3、TypeScript 5.9、Vitest 3、pnpm 10

## Global Constraints

- 只删除页面顶部“已跳过该工作簿”的临时提示。
- “跳过”决定、`SKIPPED` 当前批次状态、永久历史和后端审计保持不变。
- 覆盖成功后的“已将工作簿设为新的有效档案”提示保持不变。
- 不修改后端、IPC、文件归档策略或未关联的 `workflow.css` 工作区改动。

---

### Task 1: 调整重复决定成功消息

**Files:**
- Modify: `tests/unit/import-folder-flow.test.ts:115-153,180-228`
- Modify: `src/renderer/features/archive-import/store.ts:151-168`

**Interfaces:**
- Consumes: `useImportStore().decide(itemId: ImportItemId, decision: "OVERWRITE" | "SKIP"): Promise<void>`、服务端 `ImportItem` 响应。
- Produces: `SKIP` 成功后 `store.message === ""` 且对应条目状态为 `SKIPPED`；`OVERWRITE` 成功提示不变。

- [ ] **Step 1: 写入会失败的 SKIP 消息回归测试**

在 `tests/unit/import-folder-flow.test.ts` 的手动重复工作簿用例之后增加以下测试。API 是外部边界，沿用该文件已有的 mock；断言落在真实 Pinia store 的可观察状态上。

```ts
it("clears the page message after skipping a duplicate workbook", async () => {
  const selectWorkbooks = vi.fn<PersonnelArchiveBridge["selectWorkbooks"]>()
  selectWorkbooks.mockResolvedValue([
    { name: "手动重复档案.xlsx", size: 4, bytes: workbookBytes },
  ])
  installBridge({ selectWorkbooks })
  vi.mocked(uploadWorkbooks).mockResolvedValue(
    importBatchSchema.parse({
      batchId: "batch-skip-manual",
      items: [
        {
          itemId: "item-skip-manual",
          fileName: "手动重复档案.xlsx",
          status: "PENDING_DECISION",
          code: "DUPLICATE_REQUIRES_DECISION",
          message: "档案已存在，请选择覆盖或跳过",
        },
      ],
    }),
  )
  vi.mocked(submitDecision).mockResolvedValue(
    importItemSchema.parse({
      itemId: "item-skip-manual",
      fileName: "手动重复档案.xlsx",
      status: "SKIPPED",
      code: "SKIPPED",
      message: "已跳过，档案未变更",
    }),
  )
  const store = useImportStore()
  await store.chooseFiles()
  await store.precheck()
  const pending = store.items[0]
  if (pending === undefined) throw new TypeError("测试缺少待确认条目")

  await store.decide(pending.itemId, "SKIP")

  expect(store.message).toBe("")
  expect(store.items[0]?.status).toBe("SKIPPED")
})
```

- [ ] **Step 2: 运行聚焦测试并确认 RED**

运行：

```bash
pnpm vitest run tests/unit/import-folder-flow.test.ts
```

预期：新增测试失败，实际 `store.message` 为“已跳过该工作簿”；原有用例保持通过。

- [ ] **Step 3: 写入最小生产修改**

在 `src/renderer/features/archive-import/store.ts` 的 `decide` 成功分支中，将消息赋值改为：

```ts
message.value = decision === "SKIP" ? "" : "已将工作簿设为新的有效档案"
```

不要改动 `submitDecision`、`updatedRow` 合并、自动文件归档或异常提示逻辑。

- [ ] **Step 4: 运行聚焦测试并确认 GREEN**

运行：

```bash
pnpm vitest run tests/unit/import-folder-flow.test.ts
```

预期：该测试文件全部通过。

- [ ] **Step 5: 锁定覆盖成功提示**

在现有 `waits for an explicit overwrite result before archiving a duplicate automatic file` 测试的最终断言中增加：

```ts
expect(store.message).toBe("已将工作簿设为新的有效档案")
```

该断言保护本次修改未误伤 `OVERWRITE` 分支。

- [ ] **Step 6: 运行完整客户端验证**

依次运行：

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
git diff --check
```

预期：类型检查、所有单元测试、构建和 diff 检查通过；Biome 只允许仓库中已知的设计预览告警，不新增告警。当前 Codex macOS Seatbelt 环境不创建 Electron 进程，因此 `pnpm test:e2e` 留给普通桌面会话或 Windows CI。

- [ ] **Step 7: 对照项目文档并提交**

确认 `AGENTS.md` 中“跳过状态仍被区分”和自动文件不移动规则仍准确；`../CODE_GUIDE.md` 的模块/API/数据流未发生变化，因此无需修改。只暂存本任务的生产文件和测试文件，不暂存用户已有的 `src/renderer/src/styles/dossier-reading-desk/workflow.css` 修改。

```bash
git add src/renderer/features/archive-import/store.ts tests/unit/import-folder-flow.test.ts
git commit -m "fix(desktop): hide skipped workbook prompt"
```
