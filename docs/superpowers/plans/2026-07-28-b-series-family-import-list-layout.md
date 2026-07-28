# B-Series Family and Import List Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the B copy's family-search split desk and import three-column desk with the original client's full-width vertical information structure while retaining B-series styling and all existing behavior.

**Architecture:** Keep every store, feature API, schema, router contract, pagination helper, duplicate-decision flow, and Electron boundary unchanged. Refactor only the two page templates and their local B-series CSS, then update component contracts and Electron geometry/screenshots. Family results remain query DTOs until the user opens an independent dossier; import queue/current/history remain separate state owners arranged in one vertical stack.

**Tech Stack:** Vue 3 `<script setup>`, TypeScript strict mode, Pinia, Vue Router, Element Plus, Vitest/Vue Test Utils, Playwright Electron, Biome, electron-vite.

## Global Constraints

- Work only in `/Users/zhongerbing/Documents/xm/personnel-archive/personnel-archive-desktop-b` except the required root `CODE_GUIDE.md` documentation update.
- Preserve checkpoint tag `b-series-v1-before-list-redesign` at commit `535845a`; never move or delete it.
- Do not modify the sibling `personnel-archive-desktop` implementation.
- Use the original client's vertical information order, not its theme: all runtime styling remains B-series cobalt `#034ed6`, white paper, fine borders, restrained shadows, and current B buttons/status tags.
- Do not restore Avue or any deleted preview/drawer component.
- Do not change backend APIs, Electron IPC, permissions, automatic archive policy, duplicate-decision semantics, pagination capacity, sensitive-data handling, or route names.
- Every personnel, family, import-history, queued-file, and current-result page continues to expose 20 rows per page.
- Support the existing 1080px minimum window, 60px top bar, and 252px authenticated sidebar.
- At 1080px the application page body must not overflow horizontally; wide tables scroll only inside their paper container.
- Do not include the paused macOS development Dock-name change in this work.

---

### Task 1: Replace the Family Match Desk with a Full-Width Results Ledger

**Files:**
- Modify: `tests/unit/family-search-reading-desk.test.ts`
- Modify: `src/renderer/features/family-search/FamilySearchPage.vue`
- Modify: `src/renderer/src/styles/dossier-reading-desk/search.css`

**Interfaces:**
- Consumes: `useFamilySearchStore()` with `query`, `results`, `page`, `total`, `loading`, `searched`, `message`, and `search(page: number): Promise<void>`.
- Consumes: route name `person-detail` with string `personId` and query keys `member` and `relationship`.
- Produces: `.family-search-paper`, `.family-result-sheet`, and `[data-test="family-search-results"]` as the stable vertical-layout hooks used by Task 3.
- Produces: one `[data-test="view-matched-archive"]` action per result; it must not call the archive detail API on the search route.

- [ ] **Step 1: Rewrite the component contract to describe the vertical ledger**

Replace the split-desk assertions in `tests/unit/family-search-reading-desk.test.ts` with assertions that require the new structure and all result fields:

```ts
expect(wrapper.find(".family-search-paper").exists()).toBe(true)
expect(wrapper.find(".family-result-sheet").exists()).toBe(true)
expect(wrapper.find(".family-search-layout").exists()).toBe(false)
expect(wrapper.find(".family-match-index").exists()).toBe(false)
expect(wrapper.find(".family-match-sheet").exists()).toBe(false)
expect(wrapper.get('[data-test="family-search-results"]').text()).toContain("王晓华")
expect(wrapper.get('[data-test="family-search-results"]').text()).toContain("人员甲")
expect(wrapper.get('[data-test="family-search-results"]').text()).toContain("人员乙")
expect(wrapper.get('[data-test="family-search-results"]').text()).toContain("测试单位一")
expect(wrapper.get('[data-test="family-search-results"]').text()).toContain("财务部")
expect(wrapper.text()).toContain("2 条匹配记录")
expect(wrapper.text()).toContain("同名匹配不合并")
expect(wrapper.text()).toContain("每页 20 条")
expect(archiveApiMocks.getPerson).not.toHaveBeenCalled()
```

Select the first result's button without relying on a single selected summary:

```ts
await wrapper.findAll('[data-test="view-matched-archive"]')[0]?.trigger("click")
await flushPromises()

expect(router.currentRoute.value).toMatchObject({
  name: "person-detail",
  params: { personId: "7" },
  query: { member: "王晓华", relationship: "母亲" },
})
expect(archiveApiMocks.getPerson).not.toHaveBeenCalled()
```

- [ ] **Step 2: Run the family component test and verify RED**

Run:

```bash
pnpm exec vitest run tests/unit/family-search-reading-desk.test.ts
```

Expected: FAIL because `.family-search-paper`, `.family-result-sheet`, and `[data-test="family-search-results"]` do not exist and the split-desk classes still render.

- [ ] **Step 3: Remove split-selection state and preserve explicit detail navigation**

In `FamilySearchPage.vue`, remove `computed`, `ref`, `selectedKey`, `selectedResult`, `resultKey`, and `selectResult`. Keep a direct search function and pass each result to the existing route operation:

```ts
import { Search } from "@element-plus/icons-vue"
import { useRouter } from "vue-router"
import FixedListPagination from "@/shared/components/FixedListPagination.vue"
import type { FamilySearchItem } from "./schemas"
import { useFamilySearchStore } from "./store"

const store = useFamilySearchStore()
const router = useRouter()

async function search(page = 0): Promise<void> {
  await store.search(page)
}

function openMatchedArchive(result: FamilySearchItem): void {
  void router.push({
    name: "person-detail",
    params: { personId: result.personId },
    query: { member: result.matchedMemberName, relationship: result.relationship },
  })
}
```

- [ ] **Step 4: Implement the full-width B-series search and results papers**

Use a form paper followed by one result paper. Preserve the existing page header and use this structure for the content:

```vue
<form class="family-search-paper" @submit.prevent="search(0)">
  <label for="family-search-query">家庭成员姓名</label>
  <div class="family-search-control">
    <div class="family-search-input">
      <el-icon><Search /></el-icon>
      <input
        id="family-search-query"
        v-model="store.query"
        data-test="family-search-query"
        type="search"
        autocomplete="off"
        placeholder="例如：晓华"
      />
    </div>
    <el-button
      type="primary"
      data-test="family-search-submit"
      :loading="store.loading"
      native-type="submit"
    >
      查找相关档案
    </el-button>
  </div>
</form>

<el-alert
  v-if="store.message"
  class="family-search-error"
  :title="store.message"
  type="error"
  :closable="false"
  show-icon
/>

<section class="family-result-sheet">
  <header class="family-result-heading">
    <div>
      <span>RELATIONSHIP LEDGER</span>
      <h2>查询结果</h2>
      <small>{{ store.searched ? `${store.total} 条匹配记录` : '等待查询' }} · 同名匹配不合并</small>
    </div>
  </header>
  <el-table
    v-if="store.results.length"
    v-loading="store.loading"
    data-test="family-search-results"
    :data="store.results"
    stripe
  >
    <el-table-column label="匹配成员" min-width="150">
      <template #default="scope">
        <strong class="matched-name">{{ scope.row.matchedMemberName }}</strong>
        <small class="relationship">{{ scope.row.relationship || '关系未填写' }}</small>
      </template>
    </el-table-column>
    <el-table-column label="档案姓名" min-width="130">
      <template #default="scope">{{ scope.row.personName || '未填写姓名' }}</template>
    </el-table-column>
    <el-table-column label="单位 / 部门" min-width="230">
      <template #default="scope">
        {{ scope.row.organization || '单位未填写' }}
        <small class="relationship">{{ scope.row.department || '部门未填写' }}</small>
      </template>
    </el-table-column>
    <el-table-column prop="position" label="职务" min-width="140" />
    <el-table-column prop="titleOrSkill" label="职称 / 技能" min-width="150" />
    <el-table-column label="档案操作" width="110" fixed="right">
      <template #default="scope">
        <el-button
          type="primary"
          link
          data-test="view-matched-archive"
          @click="openMatchedArchive(scope.row)"
        >
          查看档案
        </el-button>
      </template>
    </el-table-column>
  </el-table>
  <div v-else-if="store.loading" class="list-loading" role="status">
    <span>正在检索家庭成员关系…</span>
    <el-skeleton :rows="5" animated />
  </div>
  <div v-else class="family-result-empty">
    <strong>{{ store.searched ? '未找到匹配档案' : '请输入家庭成员姓名进行查询' }}</strong>
    <span>{{ store.searched ? '可减少姓名字符后再次查找。' : '支持成员姓名包含式模糊检索。' }}</span>
  </div>
  <FixedListPagination
    v-if="store.results.length"
    :page="store.page"
    :total="store.total"
    @change="search"
  />
</section>
```

Each result action must carry its own row:

```vue
<el-button
  type="primary"
  link
  data-test="view-matched-archive"
  @click="openMatchedArchive(scope.row)"
>
  查看档案
</el-button>
```

- [ ] **Step 5: Replace split-desk CSS with B-series ledger CSS**

Remove selectors owned only by `.family-search-layout`, `.family-match-index`, `.family-result-list`, `.family-match-sheet`, and their children. Define the new layout with B variables:

```css
.search-page {
  max-width: 1510px;
}

.family-search-paper,
.family-result-sheet {
  min-width: 0;
  overflow: hidden;
  background: #fff;
  border: 1px solid var(--dossier-line);
  border-radius: var(--dossier-card-radius);
  box-shadow: 0 12px 34px rgb(20 25 40 / 4%);
}

.family-search-paper {
  display: grid;
  gap: 8px;
  padding: 14px 16px 16px;
}

.family-search-control {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
}

.family-result-sheet {
  position: relative;
}

.family-result-sheet::before {
  position: absolute;
  z-index: 2;
  top: 0;
  right: 0;
  left: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--dossier-primary), #2874ee 70%, #1fb2de);
  content: "";
}

.family-result-heading {
  display: flex;
  min-height: 84px;
  align-items: center;
  padding: 18px 20px;
  border-bottom: 1px solid var(--dossier-line-soft);
}

@media (max-width: 1160px) {
  .family-search-control {
    grid-template-columns: minmax(0, 1fr);
  }

  .family-search-control .el-button {
    width: 100%;
  }
}
```

Style Element Plus table headers, cells, fixed right column, empty state, and pagination under `.family-result-sheet`; set its table wrapper to `overflow-x: auto` without setting a page-level fixed width.

- [ ] **Step 6: Verify GREEN and run adjacent contracts**

Run:

```bash
pnpm exec vitest run tests/unit/family-search-reading-desk.test.ts tests/unit/query-list-pagination.test.ts
pnpm typecheck
pnpm exec biome check src/renderer/features/family-search/FamilySearchPage.vue src/renderer/src/styles/dossier-reading-desk/search.css tests/unit/family-search-reading-desk.test.ts
```

Expected: all selected tests PASS, typecheck exits 0, and Biome reports no diagnostics for the three files.

- [ ] **Step 7: Commit the family ledger**

```bash
git add tests/unit/family-search-reading-desk.test.ts src/renderer/features/family-search/FamilySearchPage.vue src/renderer/src/styles/dossier-reading-desk/search.css
git commit -m "feat(desktop): reshape family search as B-series ledger"
```

---

### Task 2: Replace the Import Three-Column Desk with a Vertical Workflow Stack

**Files:**
- Modify: `tests/unit/import-list-pagination.test.ts`
- Modify: `tests/unit/import-history-page.test.ts`
- Modify: `src/renderer/features/archive-import/ImportPage.vue`
- Modify: `src/renderer/features/archive-import/ImportHistoryPanel.vue`
- Modify: `src/renderer/src/styles/dossier-reading-desk/workflow.css`

**Interfaces:**
- Consumes: `useImportStore()` and its existing `chooseFiles`, `precheck`, `decide`, `retryArchive`, queue, current items, scan state, messages, and pending count.
- Consumes: `useLocalListPagination()` for queued workbooks and current results with `LIST_PAGE_SIZE = 20`.
- Consumes: `ImportHistoryPanel` prop `{ readonly refreshKey: string }` and server pagination `{ page, size: 20 }`.
- Produces: `.import-workflow-stack`, `.import-picker-sheet`, `.import-current-sheet`, and existing `#import-history` as Task 3 hooks.
- Produces: the existing duplicate dialog behavior without signature or copy changes.

- [ ] **Step 1: Rewrite import layout assertions before changing production code**

In the first test of `tests/unit/import-list-pagination.test.ts`, replace the old three-column expectations with:

```ts
expect(wrapper.find(".import-workflow-stack").exists()).toBe(true)
expect(wrapper.find(".import-picker-sheet").text()).toContain("选择文件")
expect(wrapper.find(".import-picker-sheet").text()).toContain("待处理文件")
expect(wrapper.find(".import-current-sheet").text()).toContain("当前批次")
expect(wrapper.find("#import-history").exists()).toBe(true)
expect(wrapper.find(".import-reading-layout").exists()).toBe(false)
expect(wrapper.find(".import-queue-index").exists()).toBe(false)
expect(wrapper.find(".import-outline").exists()).toBe(false)
```

Keep all existing 20-item, second-page, all-failed, and partial-success assertions unchanged. In `tests/unit/import-history-page.test.ts`, require the new history paper heading while preserving API assertions:

```ts
expect(wrapper.find(".import-history-sheet").exists()).toBe(true)
expect(wrapper.text()).toContain("导入记录")
expect(wrapper.text()).toContain("永久历史")
expect(wrapper.text()).toContain("重新打开软件仍可查询")
```

- [ ] **Step 2: Run import tests and verify RED**

Run:

```bash
pnpm exec vitest run tests/unit/import-list-pagination.test.ts tests/unit/import-history-page.test.ts
```

Expected: FAIL because `.import-workflow-stack`, `.import-picker-sheet`, and `.import-current-sheet` do not exist and the old three-column hooks still render.

- [ ] **Step 3: Remove only import-page outline state and imports**

Delete the `DossierOutline` import and `IMPORT_SECTIONS` constant from `ImportPage.vue`. Do not change `completedCount`, `historyRefreshKey`, `currentBatchSummary`, duplicate dialog refs, status formatters, or any store call.

The remaining imports begin with:

```ts
import { ElMessageBox } from "element-plus"
import { computed, ref } from "vue"
import FixedListPagination from "@/shared/components/FixedListPagination.vue"
import { useLocalListPagination } from "@/shared/components/list-pagination"
```

- [ ] **Step 4: Implement the vertical picker, queue, current batch, and history stack**

Replace `.import-reading-layout` and its three children with one `.import-workflow-stack`. Keep both alerts between the picker and current batch:

```vue
<div class="import-workflow-stack">
  <section class="import-picker-sheet">
    <header class="import-picker-heading">
      <div>
        <span>INTAKE QUEUE</span>
        <h2>选择文件</h2>
        <small>仅支持 .xlsx；每批最多 100 份，单份不超过 12 MiB。</small>
      </div>
      <div class="picker-actions">
        <el-button :disabled="store.loading || store.scanning" @click="store.chooseFiles">
          选择文件
        </el-button>
        <el-button
          type="primary"
          :loading="store.loading"
          :disabled="store.scanning || store.queuedWorkbooks.length === 0"
          @click="store.precheck"
        >
          上传并检查
        </el-button>
      </div>
    </header>

    <div v-if="store.queuedWorkbooks.length" class="import-queued-section">
      <div class="import-queued-caption">
        <strong>待处理文件</strong>
        <span>{{ store.queuedWorkbooks.length }} 份</span>
      </div>
      <div class="queue-records">
        <div
          v-for="queued in queuedPagination.visibleItems.value"
          :key="queued.id"
          class="queued-file-chip"
        >
          <el-tag :type="queued.source.kind === 'AUTO' ? 'warning' : 'info'" effect="plain">
            {{ sourceLabel(queued.source) }}
          </el-tag>
          <span :title="queued.file.name">{{ queued.file.name }}</span>
        </div>
      </div>
      <FixedListPagination
        :page="queuedPagination.page.value"
        :total="store.queuedWorkbooks.length"
        @change="queuedPagination.setPage"
      />
    </div>
  </section>

  <el-alert
    v-if="store.scanMessage"
    class="import-alert"
    :title="store.scanMessage"
    :type="store.scanState === 'READY' ? 'info' : 'warning'"
    :closable="false"
    show-icon
  />
  <el-alert
    v-if="store.message"
    class="import-alert"
    :title="store.message"
    :type="store.items.some((item) => item.status === 'FAILED') ? 'warning' : 'info'"
    :closable="false"
    show-icon
  />

  <section id="import-current" class="import-current-sheet">
    <header class="import-section-heading">
      <div>
        <span>CURRENT BATCH</span>
        <h2>当前批次</h2>
        <small>{{ completedCount }} / {{ store.items.length }} 已处理</small>
      </div>
      <el-tag v-if="store.items.length" :type="currentBatchSummary.type">
        {{ currentBatchSummary.kind === 'PENDING' ? `${store.pendingCount} 项待确认` : currentBatchSummary.label }}
      </el-tag>
    </header>
    <el-table v-if="store.items.length" :data="resultPagination.visibleItems.value" stripe>
      <el-table-column
        prop="fileName"
        label="工作簿"
        min-width="240"
        show-overflow-tooltip
      />
      <el-table-column label="来源" width="105">
        <template #default="scope">
          <el-tag effect="plain" :type="scope.row.source.kind === 'AUTO' ? 'warning' : 'info'">
            {{ sourceLabel(scope.row.source) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="110">
        <template #default="scope">
          <el-tag :type="importStatusMeta(scope.row.status).type">
            {{ importStatusMeta(scope.row.status).label }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="message" label="处理说明" min-width="220" />
      <el-table-column label="本地文件" min-width="210">
        <template #default="scope">
          <span :class="{ 'archive-error': scope.row.localState.kind === 'AUTO_MOVE_FAILED' }">
            {{ localStateText(scope.row.localState) }}
          </span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="120" fixed="right">
        <template #default="scope">
          <el-button
            v-if="scope.row.status === 'PENDING_DECISION'"
            type="primary"
            link
            @click="openDecision(scope.row)"
          >
            确认处理
          </el-button>
          <el-button
            v-else-if="scope.row.localState.kind === 'AUTO_MOVE_FAILED'"
            type="danger"
            link
            :loading="store.loading"
            @click="store.retryArchive(scope.row.itemId)"
          >
            重试归档
          </el-button>
          <span v-else>—</span>
        </template>
      </el-table-column>
    </el-table>
    <div v-else class="workflow-empty">
      <strong>当前没有处理中的批次</strong>
      <span>选择文件并上传检查后，逐份结果会显示在这里。</span>
    </div>
    <FixedListPagination
      :page="resultPagination.page.value"
      :total="store.items.length"
      @change="resultPagination.setPage"
    />
  </section>

  <ImportHistoryPanel id="import-history" :refresh-key="historyRefreshKey" />
</div>
```

Do not render a large queue empty panel. When no files are queued, the picker heading and disabled upload button communicate the state; the current-batch paper retains its existing explicit empty guidance.

- [ ] **Step 5: Keep history behavior and align its paper heading**

Keep the `ImportHistoryPanel.vue` script unchanged. In its template retain `.import-history-sheet`, `data-test="import-history"`, load/error/table/empty branches, and `FixedListPagination`. Use the shared vertical heading classes:

```vue
<header class="import-section-heading import-history-heading">
  <div>
    <span>PERMANENT HISTORY</span>
    <h2>永久历史 · 导入记录</h2>
    <small>记录保存在数据服务中，刷新或重新打开软件仍可查询</small>
  </div>
  <el-button :loading="loading" @click="load(page)">刷新记录</el-button>
</header>
```

Apply the same `import-section-heading` class to the current-batch header.

- [ ] **Step 6: Replace import grid CSS with a vertical B-series workflow**

Remove selectors that only support `.import-reading-layout`, `.import-queue-index`, `.import-paper-stack`, `.import-outline`, and the 1320px outline conversion. Preserve or relocate table, status, duplicate-dialog, queue-chip, and pagination styles under the new containers:

```css
.import-page {
  max-width: 1510px;
}

.import-workflow-stack {
  display: grid;
  min-width: 0;
  gap: 14px;
}

.import-picker-sheet,
.import-current-sheet,
.import-history-sheet {
  min-width: 0;
  overflow: hidden;
  background: #fff;
  border: 1px solid var(--dossier-line);
  border-radius: var(--dossier-card-radius);
  box-shadow: 0 12px 34px rgb(20 25 40 / 4%);
}

.import-picker-sheet {
  position: relative;
}

.import-picker-sheet::before,
.import-current-sheet::before,
.import-history-sheet::before {
  position: absolute;
  z-index: 2;
  top: 0;
  right: 0;
  left: 0;
  height: 3px;
  background: var(--dossier-primary);
  content: "";
}

.import-picker-heading,
.import-section-heading {
  display: flex;
  min-height: 84px;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 18px 20px;
  border-bottom: 1px solid var(--dossier-line-soft);
}

.import-queued-section {
  padding: 0 20px 16px;
}

.queue-records {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 8px;
}

.import-current-sheet,
.import-history-sheet {
  position: relative;
}

.import-current-sheet .el-table__body-wrapper,
.import-history-sheet .el-table__body-wrapper {
  overflow-x: auto;
}

@media (max-width: 1160px) {
  .import-picker-heading,
  .import-section-heading {
    align-items: stretch;
    flex-direction: column;
  }

  .picker-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
```

Use distinct top rules for current/history only if they remain within B tokens (for example cobalt for current and muted violet for permanent history). Do not set a minimum page width above the available work area.

- [ ] **Step 7: Verify GREEN and run adjacent import contracts**

Run:

```bash
pnpm exec vitest run tests/unit/import-list-pagination.test.ts tests/unit/import-history-page.test.ts tests/unit/import-decision.test.ts tests/unit/import-folder-flow.test.ts tests/unit/archive-policy.test.ts
pnpm typecheck
pnpm exec biome check src/renderer/features/archive-import/ImportPage.vue src/renderer/features/archive-import/ImportHistoryPanel.vue src/renderer/src/styles/dossier-reading-desk/workflow.css tests/unit/import-list-pagination.test.ts tests/unit/import-history-page.test.ts
```

Expected: all selected tests PASS, typecheck exits 0, and Biome reports no diagnostics for the listed files.

- [ ] **Step 8: Commit the vertical import workflow**

```bash
git add tests/unit/import-list-pagination.test.ts tests/unit/import-history-page.test.ts src/renderer/features/archive-import/ImportPage.vue src/renderer/features/archive-import/ImportHistoryPanel.vue src/renderer/src/styles/dossier-reading-desk/workflow.css
git commit -m "feat(desktop): stack B-series import workflow"
```

---

### Task 3: Update Electron Geometry and Screenshot Acceptance

**Files:**
- Modify: `tests/e2e/b-series-layout.spec.ts`
- Generated but ignored: `output/b-series/family-search-1440.png`
- Generated but ignored: `output/b-series/family-search-1080.png`
- Generated but ignored: `output/b-series/import-1440.png`
- Generated but ignored: `output/b-series/import-1080.png`

**Interfaces:**
- Consumes: `.family-search-paper`, `.family-result-sheet`, `.import-workflow-stack`, `.import-picker-sheet`, `.import-current-sheet`, and `#import-history` from Tasks 1–2.
- Produces: real Electron evidence that both pages are vertically stacked at 1440×960 and 1080×800, retain B shell geometry, and do not cause page-level horizontal overflow.

- [ ] **Step 1: Change E2E expectations to the new page contracts**

Replace the old family/import selectors in `tests/e2e/b-series-layout.spec.ts`:

```ts
await page.getByRole("link", { name: "家庭成员查询" }).click()
await page.locator('[data-test="family-search-query"]').fill("测试乙")
await page.locator('[data-test="family-search-submit"]').click()
await expect(page.locator(".family-result-sheet")).toContainText("测试乙")
await expect(page.locator('[data-test="family-search-results"]')).toContainText("测试丙")
await expect(page.locator(".family-match-index")).toHaveCount(0)
await expect(page.locator(".family-match-sheet")).toHaveCount(0)
await capture(page, "family-search-1440.png")

await page.getByRole("link", { name: "批量导入档案" }).click()
await expect(page.locator(".import-workflow-stack")).toBeVisible()
await expect(page.locator(".import-picker-sheet")).toBeVisible()
await expect(page.locator(".import-current-sheet")).toBeVisible()
await expect(page.locator("#import-history")).toContainText("测试档案工作簿.xlsx")
await expect(page.locator(".import-outline")).toHaveCount(0)
await capture(page, "import-1440.png")
```

- [ ] **Step 2: Add 1080px vertical-layout and overflow acceptance**

After each 1440px capture, switch to 1080×800 and assert that the papers share the same horizontal origin and the document has no page-level overflow:

```ts
await page.setViewportSize({ width: 1080, height: 800 })
const familyLeftEdges = await page
  .locator(".family-search-paper, .family-result-sheet")
  .evaluateAll((elements) => elements.map((element) => Math.round(element.getBoundingClientRect().left)))
expect(new Set(familyLeftEdges).size).toBe(1)
expect(
  await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
).toBe(true)
await capture(page, "family-search-1080.png")
```

For import, collect `.import-picker-sheet, .import-current-sheet, .import-history-sheet`, require one unique left edge, assert the same overflow predicate, and capture `import-1080.png`.

- [ ] **Step 3: Run E2E once before implementation integration is considered complete**

Run:

```bash
pnpm build
pnpm exec playwright test tests/e2e/b-series-layout.spec.ts
```

Expected: one Playwright test PASS and all four regenerated family/import screenshots exist.

- [ ] **Step 4: Inspect all four screenshots at original detail**

Open each image with the local image viewer and verify:

- search/action row is balanced and results use the full paper width;
- all result columns and the fixed action remain reachable;
- import order is picker → current batch → permanent history;
- neither page contains the removed left index/right outline;
- 1080px buttons wrap without clipping and only table interiors can scroll horizontally;
- B top bar, sidebar, typography, cobalt rules, paper borders, and status tags remain visually consistent.

If any check fails, modify only the relevant Task 1/2 CSS and rerun Steps 3–4 before committing.

- [ ] **Step 5: Commit visual acceptance**

```bash
git add tests/e2e/b-series-layout.spec.ts
git commit -m "test(desktop): accept vertical B-series list workflows"
```

Do not add `output/b-series/*.png`; `output/` remains ignored.

---

### Task 4: Synchronize Documentation and Run Full Verification

**Files:**
- Modify: `AGENTS.md`
- Modify outside child Git repository: `../CODE_GUIDE.md`

**Interfaces:**
- Consumes: final component names and behavior from Tasks 1–3.
- Produces: accurate project status and source map without claiming a B-copy promotion.

- [ ] **Step 1: Update the B client knowledge base**

In `AGENTS.md`, replace the current status sentence that calls these pages a “family-member match desk” and “import queue/current-results/history desk” with:

```markdown
- The family-member route uses a B-series full-width search paper followed by a paginated relationship ledger; every match remains independent and full detail is fetched only after the explicit archive action. The import route uses a vertical B-series workflow of file selection/queued files, current results, and persistent history; duplicate decisions retain the existing secure dialog flow.
```

In the UI contract, add:

```markdown
- Family search and batch import deliberately use full-width vertical papers instead of the personnel dossier's three-column pattern; wide tables scroll inside their paper and must not create page-level horizontal overflow.
```

- [ ] **Step 2: Update the cross-project source map**

In `../CODE_GUIDE.md` section 4.5, replace the B-family and B-import rows with:

```markdown
| `src/renderer/features/family-search/FamilySearchPage.vue` | B 全宽搜索纸页与关系结果台账；同名关系不去重，只有明确“查看档案”才进入完整详情读取 |
| `src/renderer/features/archive-import/{ImportPage,ImportHistoryPanel}.vue` | B 纵向工作流：文件选择/待处理文件、当前结果和永久历史依次排列；仍保持所有列表每页 20 条及原重复决定语义 |
```

Update section 6.5 so the B-family line describes a result ledger instead of a match summary, and the B import explanation states that wide table scrolling is contained inside each paper.

- [ ] **Step 3: Run the complete verification suite**

From `personnel-archive-desktop-b`, run in this order:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
git diff --check
```

Expected:

- `pnpm lint` exits 0; any warnings must be limited to inherited static files under `design-previews/central-enterprise-office-v2/` and must not involve changed runtime/test files.
- typecheck exits 0.
- all 30 or more Vitest files and all 89 or more tests pass.
- production main/preload/renderer build completes.
- all 7 or more Electron E2E scenarios pass from the normal macOS desktop session.
- `git diff --check` has no output.

- [ ] **Step 4: Verify scope and security boundaries**

Run:

```bash
rg -n 'nodeIntegration: false|contextIsolation: true|sandbox: true|webSecurity: true' src/main/index.ts
if rg -n '@smallwei/avue|from "@smallwei/avue"' package.json pnpm-lock.yaml src; then exit 1; else echo 'Avue runtime references: none'; fi
git -C ../personnel-archive-desktop status --short
git status --short
git log --oneline --decorate -8
```

Expected:

- all four Electron security settings remain present;
- the Avue scan prints `Avue runtime references: none`;
- the original client has no new changes from this work;
- the B client contains only the intended documentation change before the final docs commit;
- tag `b-series-v1-before-list-redesign` still points to `535845a`.

- [ ] **Step 5: Commit child documentation**

```bash
git add AGENTS.md
git commit -m "docs(desktop): document vertical list workflows"
```

The root repository is not Git-initialized, so `../CODE_GUIDE.md` remains a synchronized workspace document rather than part of the child commit.

- [ ] **Step 6: Perform final clean-state audit**

Run:

```bash
git status --short
git tag --points-at 535845a
git log --oneline --decorate -10
```

Expected: child worktree is clean, the checkpoint tag is listed, and the task's feature/test/docs commits appear after `bc2a208` without rewriting the saved B-series v1 history.
