# B 版隐藏未配置文件夹提示 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 B 版批量导入页隐藏 `UNCONFIGURED` 自动文件夹提示，同时保留真实扫描状态、手动导入和整套自动扫描/归档能力。

**Architecture:** 不改变 Pinia 状态机、IPC 或文件系统流程，只在 `ImportPage.vue` 的扫描状态展示边界过滤 `UNCONFIGURED`。用独立组件测试锁定“未配置不显示、真实失败仍显示”的用户可见行为。

**Tech Stack:** Vue 3、Pinia、Element Plus、Vitest、Vue Test Utils、TypeScript。

## Global Constraints

- 只修改 `personnel-archive-desktop-b`；不触碰兄弟目录 `personnel-archive-desktop`。
- 自动扫描定时器、文件夹设置、IPC、安全归档、手动导入和后端 API 全部保持不变。
- `READY` 和真实错误状态的自动扫描消息继续显示；仅 `UNCONFIGURED` 不渲染。
- 不新增依赖，不修改路由，不恢复当前隐藏的文件夹设置导航入口。
- 该可见性变化不增加、删除或重命名模块、API、数据流、安全边界或支持流程，因此无需修改 `AGENTS.md` 或 `CODE_GUIDE.md`。

---

### Task 1: 过滤未配置扫描提示

**Files:**
- Create: `tests/unit/import-scan-status.test.ts`
- Modify: `src/renderer/features/archive-import/ImportPage.vue:159-166`

**Interfaces:**
- Consumes: `useImportStore()` 暴露的 `scanState: FolderScanResult["state"]` 与 `scanMessage: string`。
- Produces: 批量导入页的展示契约——`UNCONFIGURED` 无扫描警告，其他带消息状态仍按原类型渲染。

- [ ] **Step 1: 写入失败的组件回归测试**

创建 `tests/unit/import-scan-status.test.ts`：

```ts
/** 批量导入扫描状态提示：未配置不干扰手动导入，真实异常仍需可见。 */
import { mount } from "@vue/test-utils"
import ElementPlus from "element-plus"
import { createPinia, setActivePinia } from "pinia"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { fetchImportHistory } from "@/features/archive-import/api"
import ImportPage from "@/features/archive-import/ImportPage.vue"
import { importHistoryPageSchema } from "@/features/archive-import/schemas"
import { useImportStore } from "@/features/archive-import/store"

vi.mock("@/features/archive-import/api", () => ({
  fetchImportHistory: vi.fn(),
  submitDecision: vi.fn(),
  uploadWorkbooks: vi.fn(),
}))

function mountPage() {
  return mount(ImportPage, { global: { plugins: [ElementPlus] } })
}

describe("ImportPage automatic scan status", () => {
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

  it("does not present unconfigured automatic folders as a manual import warning", () => {
    const store = useImportStore()
    store.scanState = "UNCONFIGURED"
    store.scanMessage = "请先设置待上传文件夹和归档文件夹"

    const wrapper = mountPage()

    expect(wrapper.text()).not.toContain("请先设置待上传文件夹和归档文件夹")
    expect(wrapper.get(".import-picker-sheet").text()).toContain("选择文件")
    wrapper.unmount()
  })

  it("keeps a real automatic scan failure visible", () => {
    const store = useImportStore()
    store.scanState = "FAILED"
    store.scanMessage = "无法读取待上传文件夹"

    const wrapper = mountPage()

    expect(wrapper.text()).toContain("无法读取待上传文件夹")
    wrapper.unmount()
  })
})
```

- [ ] **Step 2: 运行目标测试并确认 RED**

Run:

```bash
./node_modules/.bin/vitest run tests/unit/import-scan-status.test.ts
```

Expected: 第一项测试 FAIL，失败内容显示页面仍包含“请先设置待上传文件夹和归档文件夹”；第二项测试 PASS。

- [ ] **Step 3: 实施最小模板条件**

在 `ImportPage.vue` 中只修改扫描提示的 `v-if`：

```vue
<el-alert
  v-if="store.scanMessage && store.scanState !== 'UNCONFIGURED'"
  class="import-alert"
  :title="store.scanMessage"
  :type="store.scanState === 'READY' ? 'info' : 'warning'"
  :closable="false"
  show-icon
/>
```

- [ ] **Step 4: 运行目标测试并确认 GREEN**

Run:

```bash
./node_modules/.bin/vitest run tests/unit/import-scan-status.test.ts
```

Expected: 2 tests PASS，0 failures。

- [ ] **Step 5: 运行完整静态与单元验证**

Run:

```bash
./node_modules/.bin/biome check .
./node_modules/.bin/vue-tsc --noEmit -p tsconfig.web.json
./node_modules/.bin/tsc --noEmit -p tsconfig.node.json
./node_modules/.bin/vitest run
./node_modules/.bin/electron-vite build
git diff --check
```

Expected: 所有命令退出码为 0；Biome 只允许仓库中既有的设计预览警告，Vitest 无失败。Electron E2E 仅可在普通桌面会话运行；当前 Codex Seatbelt 主机不得创建 Electron 测试进程。

- [ ] **Step 6: 检查范围并提交**

Run:

```bash
git status --short
git diff -- src/renderer/features/archive-import/ImportPage.vue tests/unit/import-scan-status.test.ts
git add src/renderer/features/archive-import/ImportPage.vue tests/unit/import-scan-status.test.ts
git commit -m "fix(desktop): hide unconfigured scan warning"
```

Expected: 实施提交只包含目标组件和回归测试；自动扫描状态机、IPC、设置页及兄弟客户端均无修改。
