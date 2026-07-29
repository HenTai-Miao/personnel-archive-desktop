# B 版重复档案弹窗关闭控件优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让外层重复档案弹窗的关闭按钮离开钴蓝顶线，并在二次覆盖确认期间移除内外两个叉号，保留明确的返回与确认路径。

**Architecture:** `ImportPage.vue` 用一个页面本地布尔状态表达二次确认生命周期，并把它绑定到外层 `ElDialog` 的关闭能力；`ElMessageBox.confirm` 通过选项移除内层叉号和遮罩关闭。共享 `dialogs.css` 负责所有 B 系列 `ElDialog` 关闭按钮的 32px 点击区域与 16px 内缩，组件测试验证两层弹窗行为，计算样式测试验证几何规则。

**Tech Stack:** Vue 3、Element Plus 2.11、Pinia 3、TypeScript 5.9、Vitest 3、happy-dom、Biome、electron-vite

## Global Constraints

- 外层“发现重复档案”弹窗在普通查看阶段仍保留一个关闭按钮。
- 二次“确认覆盖档案”弹窗不渲染叉号，且打开期间外层叉号与外层 Esc 关闭同时暂停。
- 二次确认禁止点击遮罩关闭，保留 Esc 作为“返回检查”。
- 默认 `SKIP`、重复决定 API、覆盖文案、后端审计和导入状态机保持不变。
- 沿用现有 B 系列钴蓝、浅蓝、墨色和焦点样式，不新增视觉体系或依赖。

---

### Task 1: 锁定双层弹窗关闭行为

**Files:**
- Create: `tests/unit/import-duplicate-dialog.test.ts`
- Modify: `src/renderer/features/archive-import/ImportPage.vue:17-20,82-99,253-259`

**Interfaces:**
- Consumes: `ElMessageBox.confirm(message, title, options)` 与外层 `ElDialog` 的 `show-close`、`close-on-press-escape` 属性。
- Produces: 页面本地 `confirmingOverwrite: Ref<boolean>`；二次确认期间外层关闭能力暂停，确认结束后在 `finally` 中恢复。

- [ ] **Step 1: 写入失败的真实弹窗行为测试**

创建 `tests/unit/import-duplicate-dialog.test.ts`。使用真实 Element Plus 弹窗和 `DOMWrapper(document.body)`，只 mock 导入历史 HTTP 边界：

```ts
/** 重复档案弹窗测试：外层保留规范关闭入口，覆盖二次确认只允许明确返回或确认。 */
import { DOMWrapper, flushPromises, mount } from "@vue/test-utils"
import ElementPlus, { ElMessageBox } from "element-plus"
import { createPinia, setActivePinia } from "pinia"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { fetchImportHistory } from "@/features/archive-import/api"
import ImportPage from "@/features/archive-import/ImportPage.vue"
import type { ImportRow } from "@/features/archive-import/queue-model"
import { importHistoryPageSchema, importItemSchema } from "@/features/archive-import/schemas"
import { useImportStore } from "@/features/archive-import/store"

vi.mock("@/features/archive-import/api", () => ({
  fetchImportHistory: vi.fn(),
  submitDecision: vi.fn(),
  uploadWorkbooks: vi.fn(),
}))

const duplicateRow: ImportRow = {
  ...importItemSchema.parse({
    itemId: "item-duplicate-dialog",
    fileName: "重复档案.xlsx",
    status: "PENDING_DECISION",
    code: "DUPLICATE_REQUIRES_DECISION",
    message: "档案已存在，请选择覆盖或跳过",
    duplicate: {
      personName: "测试员工甲",
      identityCardLastFour: "001X",
      existingEmployeeNo: "TEST-001",
      incomingEmployeeNo: "TEST-001",
      existingUpdatedAt: "2026-07-29T03:00:00Z",
    },
  }),
  source: { kind: "MANUAL" },
  localState: { kind: "MANUAL_RETAINED" },
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.mocked(fetchImportHistory).mockResolvedValue(
    importHistoryPageSchema.parse({
      content: [],
      page: 0,
      size: 20,
      totalElements: 0,
      totalPages: 0,
    }),
  )
})

afterEach(() => {
  ElMessageBox.close()
  vi.restoreAllMocks()
  document.body.innerHTML = ""
})

function button(body: DOMWrapper<Element>, text: string) {
  const target = body.findAll("button").find((candidate) => candidate.text().trim() === text)
  if (target === undefined) throw new TypeError(`测试缺少“${text}”按钮`)
  return target
}

async function openOverwriteReview(errorHandler = vi.fn()) {
  useImportStore().items = [duplicateRow]
  const wrapper = mount(ImportPage, {
    attachTo: document.body,
    global: { plugins: [ElementPlus], config: { errorHandler } },
  })
  await flushPromises()
  const body = new DOMWrapper(document.body)
  await button(body, "确认处理").trigger("click")
  await body.get('.decision-options input[value="OVERWRITE"]').setValue(true)
  return { wrapper, body }
}

describe("ImportPage duplicate dialog", () => {
  it("shows one outer close control and hides both close controls during overwrite review", async () => {
    const { wrapper, body } = await openOverwriteReview()
    expect(body.find(".duplicate-decision-dialog .el-dialog__headerbtn").exists()).toBe(true)

    await button(body, "继续覆盖").trigger("click")
    await flushPromises()

    expect(body.find(".el-message-box").exists()).toBe(true)
    expect(body.find(".el-message-box__headerbtn").exists()).toBe(false)
    expect(body.find(".duplicate-decision-dialog .el-dialog__headerbtn").exists()).toBe(false)

    await button(body, "返回检查").trigger("click")
    await flushPromises()

    expect(body.find(".el-message-box").exists()).toBe(false)
    expect(body.find(".duplicate-decision-dialog .el-dialog__headerbtn").exists()).toBe(true)
    wrapper.unmount()
  })

  it("restores the outer close control and propagates unexpected confirmation errors", async () => {
    const failure = new Error("覆盖确认组件异常")
    vi.spyOn(ElMessageBox, "confirm").mockRejectedValueOnce(failure)
    const errorHandler = vi.fn()
    const { wrapper, body } = await openOverwriteReview(errorHandler)

    await button(body, "继续覆盖").trigger("click")
    await flushPromises()

    expect(errorHandler).toHaveBeenCalled()
    expect(errorHandler.mock.calls[0]?.[0]).toBe(failure)
    expect(body.find(".duplicate-decision-dialog .el-dialog__headerbtn").exists()).toBe(true)
    wrapper.unmount()
  })
})
```

- [ ] **Step 2: 运行测试并确认 RED**

运行：

```bash
./node_modules/.bin/vitest run tests/unit/import-duplicate-dialog.test.ts --reporter=verbose --no-color
```

预期：第一个测试失败，因为当前内层仍存在 `.el-message-box__headerbtn`，外层关闭按钮在二次确认期间也仍存在；异常传播用例保持通过并锁定原有错误边界。

- [ ] **Step 3: 写入最小交互实现**

在 `ImportPage.vue` 的其他本地状态旁增加：

```ts
const confirmingOverwrite = ref(false)
```

把覆盖确认分支改为：

```ts
if (decision.value === "OVERWRITE") {
  confirmingOverwrite.value = true
  try {
    await ElMessageBox.confirm(
      "原有效档案将转为历史快照，本工作簿将成为新的有效档案。此操作不会删除历史记录。",
      "确认覆盖档案",
      {
        type: "warning",
        confirmButtonText: "确认覆盖",
        cancelButtonText: "返回检查",
        showClose: false,
        closeOnClickModal: false,
      },
    )
  } catch (error) {
    if (error === "cancel" || error === "close") return
    throw error
  } finally {
    confirmingOverwrite.value = false
  }
}
```

给外层 `el-dialog` 增加：

```vue
:show-close="!confirmingOverwrite"
:close-on-press-escape="!confirmingOverwrite"
```

- [ ] **Step 4: 运行测试并确认 GREEN**

运行同一 Vitest 命令。预期：新增测试通过，返回检查后外层关闭按钮恢复。

### Task 2: 将外层关闭按钮收进标题区

**Files:**
- Modify: `tests/unit/dossier-reading-desk-theme.test.ts:1-30`
- Modify: `src/renderer/src/styles/dossier-reading-desk/dialogs.css:9-21`

**Interfaces:**
- Consumes: Element Plus 的 `.el-dialog__header.show-close`、`.el-dialog__headerbtn` 和 `.el-dialog__close` DOM 类名。
- Produces: 32×32px 点击区域，`top: 16px`、`right: 16px`，标题右侧保留 64px，并提供 B 系列悬停与聚焦反馈。

- [ ] **Step 1: 写入失败的计算样式测试**

在 `tests/unit/dossier-reading-desk-theme.test.ts` 的 `describe` 中增加：

```ts
it("keeps the dialog close control inside the paper header", () => {
  document.body.innerHTML = `
    <div class="el-dialog">
      <header class="el-dialog__header show-close">
        <span class="el-dialog__title">发现重复档案</span>
        <button class="el-dialog__headerbtn"><span class="el-dialog__close">×</span></button>
      </header>
    </div>
  `
  const header = document.querySelector<HTMLElement>(".el-dialog__header")
  const close = document.querySelector<HTMLElement>(".el-dialog__headerbtn")
  if (header === null || close === null) throw new Error("弹窗关闭按钮样式夹具未渲染")

  const headerStyle = getComputedStyle(header)
  const closeStyle = getComputedStyle(close)

  expect(headerStyle.paddingRight).toBe("64px")
  expect(closeStyle.width).toBe("32px")
  expect(closeStyle.height).toBe("32px")
  expect(closeStyle.top).toBe("16px")
  expect(closeStyle.right).toBe("16px")
})
```

- [ ] **Step 2: 运行样式测试并确认 RED**

运行：

```bash
./node_modules/.bin/vitest run tests/unit/dossier-reading-desk-theme.test.ts --reporter=verbose --no-color
```

预期：测试失败，当前标题右内边距为 24px，项目样式未定义关闭按钮的 32px 尺寸和 16px 内缩。

- [ ] **Step 3: 写入最小 B 系列关闭按钮样式**

在 `dialogs.css` 的标题规则后增加：

```css
.el-dialog__header.show-close {
  padding-right: 64px;
}

.el-dialog__headerbtn {
  top: 16px;
  right: 16px;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  transition:
    color 160ms ease,
    background-color 160ms ease;
}

.el-dialog__headerbtn:hover,
.el-dialog__headerbtn:focus-visible {
  background: var(--dossier-primary-wash);
}

.el-dialog__headerbtn .el-dialog__close {
  color: var(--dossier-faint);
  font-size: 16px;
}

.el-dialog__headerbtn:hover .el-dialog__close,
.el-dialog__headerbtn:focus-visible .el-dialog__close {
  color: var(--dossier-primary);
}
```

不要修改 `.el-message-box__headerbtn`；内层控件由 `showClose: false` 从 DOM 中移除。

- [ ] **Step 4: 运行两个聚焦测试并确认 GREEN**

运行：

```bash
./node_modules/.bin/vitest run tests/unit/import-duplicate-dialog.test.ts tests/unit/dossier-reading-desk-theme.test.ts --reporter=verbose --no-color
```

预期：两个测试文件全部通过。

### Task 3: 文档同步、完整验证与提交

**Files:**
- Modify: `../CODE_GUIDE.md:245-253`
- Verify: `AGENTS.md`

**Interfaces:**
- Consumes: 新增组件测试文件及现有 B 客户端测试/构建命令。
- Produces: 代码导航记录和一个只包含本次弹窗优化的 Git 提交。

- [ ] **Step 1: 更新测试导航**

在 `../CODE_GUIDE.md` 的客户端测试表中加入：

```markdown
| `tests/unit/import-duplicate-dialog.test.ts` | 重复档案外层关闭入口、二次覆盖确认隐藏内外叉号，以及返回检查后关闭能力恢复 |
```

- [ ] **Step 2: 运行完整验证**

因当前 FlyEnv pnpm 启动器在受限网络中会等待远程签名校验，直接使用已安装的本地二进制执行等价检查：

```bash
./node_modules/.bin/biome check .
./node_modules/.bin/vue-tsc --noEmit -p tsconfig.web.json
./node_modules/.bin/tsc --noEmit -p tsconfig.node.json
./node_modules/.bin/vitest run --reporter=dot --no-color
./node_modules/.bin/electron-vite build
git diff --check
```

预期：Biome 无错误且只保留 `design-previews/central-enterprise-office-v2` 的 17 条既有警告；类型检查、全部单元测试、构建和 diff 检查退出码均为 0。Electron Playwright 在 Codex macOS Seatbelt 中不启动，视觉运行由普通桌面终端完成。

- [ ] **Step 3: 对照项目说明**

确认 `AGENTS.md` 的重复决定、安全确认和 B 系列弹窗描述仍准确；本次不改变后端 API、数据库、权限或已支持业务流，因此不修改客户端状态清单。

- [ ] **Step 4: 精确暂存并提交**

```bash
git add \
  src/renderer/features/archive-import/ImportPage.vue \
  src/renderer/src/styles/dossier-reading-desk/dialogs.css \
  tests/unit/import-duplicate-dialog.test.ts \
  tests/unit/dossier-reading-desk-theme.test.ts
git commit -m "fix(desktop): clarify dialog close controls"
```

`../CODE_GUIDE.md` 位于当前 B 客户端 Git 仓库之外，保留其工作区同步修改并在最终说明中列出。
