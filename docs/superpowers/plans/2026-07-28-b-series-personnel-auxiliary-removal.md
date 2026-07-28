# B-Series Personnel Auxiliary Removal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the marked sidebar security card and personnel-list chapter directory, expand the personnel dossier into the released width, and retain the independent detail page directory.

**Architecture:** Keep `AppShell` navigation/session behavior and all personnel stores, APIs, dossier state, routes, permissions, and security handling unchanged. Remove only the two approved renderer branches, convert the personnel reading desk from a three-column to a two-column grid, and move the E2E chapter-navigation assertion to the independent detail route where `DossierOutline` remains supported.

**Tech Stack:** Vue 3 `<script setup>`, TypeScript strict mode, Element Plus, Pinia, Vue Router, Vitest/Vue Test Utils, Playwright Electron, Biome, electron-vite.

## Global Constraints

- Work only in `/Users/zhongerbing/Documents/xm/personnel-archive/personnel-archive-desktop-b` except the required root `CODE_GUIDE.md` documentation update.
- Remove the shared sidebar card from every authenticated page because it is rendered by `AppShell.vue`; keep the top-bar “安全会话已建立” chip and all real security behavior.
- Remove the desktop and narrow-screen directory only from `PersonListPage.vue`.
- Keep `ArchiveDetailPage.vue`, `FolderSettingsPage.vue`, `DossierOutline.vue`, and `tests/unit/dossier-outline.test.ts` functional.
- Preserve the B palette, 60px top bar, 252px authenticated sidebar, 286px desktop personnel index, and 240px personnel index at 1320px and below.
- The personnel dossier column consumes all width released by the removed 238px directory.
- At the 1080px minimum window, `.reading-desk-workspace` must satisfy `scrollWidth <= clientWidth`.
- Do not change backend APIs, Electron IPC, authentication, permissions, pagination capacity, masking, photo lifecycle, batch selection/export, deletion, route names, or automatic-folder behavior.
- Do not modify the sibling `../personnel-archive-desktop` implementation or move/delete tag `b-series-v1-before-list-redesign` from commit `535845a`.
- Do not include the paused macOS development Dock-name change.

---

### Task 1: Remove the Shared Sidebar Security Card

**Files:**
- Modify: `tests/unit/app-shell.test.ts`
- Modify: `src/renderer/shared/components/AppShell.vue`
- Modify: `src/renderer/src/styles/dossier-reading-desk/navigation.css`

**Interfaces:**
- Consumes: existing `.reading-desk-sidebar`, `.session-chip`, route links, and authenticated user state.
- Produces: the same application shell without `.sidebar-security-note`; `.session-chip` remains the sole green session-status indicator.

- [ ] **Step 1: Write the failing shell contract**

In `tests/unit/app-shell.test.ts`, keep the existing session-chip assertion and add the absence contract after the sidebar assertion:

```ts
expect(wrapper.get(".session-chip").text()).toContain("安全会话已建立")
expect(wrapper.get(".reading-desk-sidebar").text()).toContain("业务目录")
expect(wrapper.find(".sidebar-security-note").exists()).toBe(false)
expect(wrapper.text()).not.toContain("卷宗已安全载入")
expect(wrapper.text()).not.toContain("敏感字段默认遮罩")
```

- [ ] **Step 2: Run the shell test and verify RED**

Run:

```bash
pnpm exec vitest run tests/unit/app-shell.test.ts
```

Expected: FAIL because `.sidebar-security-note` and both marked phrases still render.

- [ ] **Step 3: Remove the card and its private styles**

Delete this block from `AppShell.vue`:

```vue
<div class="sidebar-security-note">
  <strong><i aria-hidden="true"></i>卷宗已安全载入</strong>
  <p>敏感字段默认遮罩</p>
</div>
```

In `navigation.css`, replace the shared dot selector:

```css
.session-chip i,
.sidebar-security-note strong i {
```

with:

```css
.session-chip i {
```

Delete the complete `.sidebar-security-note`, `.sidebar-security-note strong`, and `.sidebar-security-note p` rule blocks. Delete the `.sidebar-security-note` override inside `@media (max-width: 1320px)` while preserving the sidebar padding override.

- [ ] **Step 4: Verify GREEN and scoped formatting**

Run:

```bash
pnpm exec vitest run tests/unit/app-shell.test.ts
pnpm exec biome check tests/unit/app-shell.test.ts src/renderer/shared/components/AppShell.vue src/renderer/src/styles/dossier-reading-desk/navigation.css
pnpm typecheck
```

Expected: one Vitest file passes, Biome reports no diagnostics for the three files, and typecheck exits 0.

- [ ] **Step 5: Commit the shell removal**

```bash
git add tests/unit/app-shell.test.ts src/renderer/shared/components/AppShell.vue src/renderer/src/styles/dossier-reading-desk/navigation.css
git commit -m "feat(desktop): remove sidebar security note"
```

---

### Task 2: Convert the Personnel Reading Desk to Two Columns

**Files:**
- Modify: `tests/unit/person-list-reading-desk.test.ts`
- Modify: `tests/e2e/b-series-layout.spec.ts`
- Modify: `tests/e2e/archive-detail.spec.ts`
- Modify: `src/renderer/features/person-list/PersonListPage.vue`
- Modify: `src/renderer/src/styles/dossier-reading-desk/records.css`

**Interfaces:**
- Consumes: `PersonRecordIndex`, `ArchiveDossierContent`, `useArchiveDossier()`, the `person-detail` route, and `expectWorkspaceHasNoHorizontalOverflow(page)`.
- Produces: `.person-reading-layout` with exactly two computed grid columns; no `.dossier-navigation`, `.dossier-outline`, or `.dossier-mobile-index` inside the personnel-list route.
- Preserves: `.detail-reading-layout .dossier-outline` and its section buttons after `独立查看` navigation.

- [ ] **Step 1: Rewrite the personnel component contract**

In `tests/unit/person-list-reading-desk.test.ts`, replace:

```ts
expect(wrapper.find(".dossier-outline").text()).toContain("卷宗目录")
```

with:

```ts
expect(wrapper.find(".person-reading-layout .dossier-navigation").exists()).toBe(false)
expect(wrapper.find(".person-reading-layout .dossier-outline").exists()).toBe(false)
expect(wrapper.find(".person-reading-layout .dossier-mobile-index").exists()).toBe(false)
```

Keep the explicit record activation and `getPerson` assertions unchanged.

- [ ] **Step 2: Rewrite the Electron geometry contract**

In `tests/e2e/b-series-layout.spec.ts`, after login add:

```ts
await expect(page.locator(".sidebar-security-note")).toHaveCount(0)
```

Replace the desktop personnel-column expectations with:

```ts
expect(desktopColumns).toHaveLength(2)
expect(Math.round(desktopColumns[0] ?? 0)).toBe(286)
expect((desktopColumns[1] ?? 0) > 0).toBe(true)
await expect(page.locator(".person-reading-layout .dossier-navigation")).toHaveCount(0)
```

After activating person `7`, require the reading sheet and masked identity value but keep the personnel directory absent:

```ts
await expect(page.locator(".dossier-reading-sheet")).toBeVisible()
await expect(page.locator(".person-reading-layout .dossier-navigation")).toHaveCount(0)
await expect(page.getByText("1234***********678", { exact: true })).toBeVisible()
```

At 1080px, replace the old hidden-outline/visible-mobile-index expectations with:

```ts
await expect(page.locator(".person-record-index")).toBeVisible()
await expect(page.locator(".dossier-reading-sheet")).toBeVisible()
await expect(page.locator(".person-reading-layout .dossier-outline")).toHaveCount(0)
await expect(page.locator(".person-reading-layout .dossier-mobile-index")).toHaveCount(0)
await expectWorkspaceHasNoHorizontalOverflow(page)
```

- [ ] **Step 3: Move chapter-navigation coverage to independent detail**

In `tests/e2e/archive-detail.spec.ts`, delete the personnel-list outline visibility assertion and the block that clicks “学历与教育” through `.person-reading-layout .dossier-outline`.

Immediately after clicking `独立查看` and verifying the detail sheet, add:

```ts
const detailUrl = page.url()
const detailOutline = page.locator(".detail-reading-layout .dossier-outline")
await expect(detailOutline).toBeVisible()
await detailOutline.getByRole("button", { name: /学历与教育/ }).click()
await expect(page.locator("#education")).toBeInViewport()
expect(page.url()).toBe(detailUrl)
```

Keep the list-route detail request, photo, masking, reveal/hide, and independent-route request-count assertions unchanged.

- [ ] **Step 4: Run the new contracts and verify RED**

Run:

```bash
pnpm exec vitest run tests/unit/person-list-reading-desk.test.ts
pnpm build
pnpm exec playwright test tests/e2e/b-series-layout.spec.ts tests/e2e/archive-detail.spec.ts
```

Expected: the unit test fails because the list page still renders `DossierOutline`; the Electron layout scenario fails because the personnel grid still has three columns and the list route still renders the directory. The independent detail directory remains available.

- [ ] **Step 5: Remove the list-page outline component**

In `PersonListPage.vue`:

1. Change the leading comment to describe a left record index and central complete dossier only.
2. Delete `import DossierOutline from "@/shared/components/DossierOutline.vue"`.
3. Delete the complete `DOSSIER_SECTIONS` constant.
4. Delete the final template node:

```vue
<DossierOutline title="卷宗目录" :sections="DOSSIER_SECTIONS" />
```

Do not modify `ArchiveDossierContent`, `viewDetail`, dossier selection, sensitive-value, photo, export, or deletion code.

- [ ] **Step 6: Convert the personnel grid CSS**

In `records.css`, update the module comment and replace the desktop grid with:

```css
.person-reading-layout {
  display: grid;
  grid-template-areas: "index content";
  grid-template-columns: 286px minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}
```

Delete:

```css
.person-reading-layout > .dossier-navigation {
  grid-area: navigation;
}
```

Inside `@media (max-width: 1320px)`, replace the personnel layout and remove both person-scoped outline overrides:

```css
.person-reading-layout {
  grid-template-areas: "index content";
  grid-template-columns: 240px minmax(0, 1fr);
  gap: 10px;
}
```

Do not change shared `navigation.css` rules for `.dossier-outline` or `.dossier-mobile-index`, because the independent detail and folder-settings routes still use them.

- [ ] **Step 7: Verify GREEN and inspect both widths**

Run:

```bash
pnpm exec vitest run tests/unit/person-list-reading-desk.test.ts tests/unit/dossier-outline.test.ts
pnpm exec biome check tests/unit/person-list-reading-desk.test.ts tests/e2e/b-series-layout.spec.ts tests/e2e/archive-detail.spec.ts src/renderer/features/person-list/PersonListPage.vue src/renderer/src/styles/dossier-reading-desk/records.css
pnpm typecheck
pnpm build
pnpm exec playwright test tests/e2e/b-series-layout.spec.ts tests/e2e/archive-detail.spec.ts
git diff --check
```

Expected: both unit files pass; typecheck/build pass; both Electron specs pass; fresh `personnel-empty-1440.png`, `personnel-active-1440.png`, and `personnel-1080.png` show no marked regions, no empty right column, and no page-level horizontal overflow. The independent detail outline remains visible and navigates to `#education`.

- [ ] **Step 8: Commit the personnel desk removal**

```bash
git add tests/unit/person-list-reading-desk.test.ts tests/e2e/b-series-layout.spec.ts tests/e2e/archive-detail.spec.ts src/renderer/features/person-list/PersonListPage.vue src/renderer/src/styles/dossier-reading-desk/records.css
git commit -m "feat(desktop): simplify personnel reading desk"
```

---

### Task 3: Synchronize Documentation and Run the Full Gate

**Files:**
- Modify: `AGENTS.md`
- Modify outside child Git repository: `../CODE_GUIDE.md`

**Interfaces:**
- Consumes: the final `AppShell.vue`, `PersonListPage.vue`, `ArchiveDetailPage.vue`, responsive CSS, and Electron acceptance behavior.
- Produces: project documentation that distinguishes the two-column personnel route from the still-indexed independent detail route.

- [ ] **Step 1: Update the B client knowledge base**

In `AGENTS.md`, update `CURRENT CLIENT STATUS` so it states:

```markdown
- The personnel route is a stable two-column reading desk: a 286px native record index and a central continuous dossier, with no chapter directory on the list route. Selecting a record loads its complete details and authenticated, audited photo without changing batch-export selection; explicit view/export actions remain available to every role and deletion only to `ADMIN`/`ARCHIVE_EDITOR`. At 1320px and below, the index becomes 240px while the dossier remains usable at the 1080px minimum window width. The independent detail route retains the shared chapter directory and its narrow-screen horizontal form.
```

In `UI CONTRACT`, replace the personnel three-column geometry with:

```markdown
- Preserve the B visual geometry: cobalt `#034ed6`, white paper surfaces, a 60px top bar, a 252px authenticated sidebar, and on the personnel route a 286px record index plus a flexible dossier column; at 1320px and below the personnel index becomes 240px.
- Only routes that retain `DossierOutline` convert its right directory to the shared sticky horizontal chapter index at narrower widths; the personnel list route has no desktop or mobile chapter directory. The supported minimum window remains 1080px wide.
```

Remove or revise any earlier sentence that claims the personnel route has a 238px outline. State that the shared sidebar no longer renders the redundant bottom security card while the top-bar secure-session indicator remains.

- [ ] **Step 2: Update the cross-project source map**

In `../CODE_GUIDE.md` section 4.5:

- update the `AppShell.vue` row to say the 252px business directory has no redundant bottom status card and the secure-session state remains in the top bar;
- replace the `PersonRecordIndex.vue` / `PersonListPage.vue` row with:

```markdown
| `src/renderer/features/person-list/PersonRecordIndex.vue`、`PersonListPage.vue` | 286px 原生人员索引 + 自适应中央连续卷宗；人员目录页不渲染章节目录，记录激活与批量 ZIP 勾选仍是两个独立状态，筛选/翻页/删除会清理当前卷宗临时资源 |
```

- update the B style row so 1440px uses the 286px personnel index plus flexible dossier, while only retained outline routes use the 238px directory;
- update the B test row and section 6.5 personnel-flow item to distinguish the directory-free list route from the indexed independent detail route.

Do not claim that the B copy is the current packaged client.

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

- lint exits 0; warnings, if any, remain limited to inherited static previews under `design-previews/central-enterprise-office-v2/`;
- at least 30 Vitest files and at least 89 tests pass;
- production main, preload, and renderer bundles complete;
- all 7 or more Electron E2E scenarios pass in the normal macOS desktop session;
- `git diff --check` has no output.

- [ ] **Step 4: Perform scope, security, and visual audit**

Run:

```bash
rg -n 'nodeIntegration: false|contextIsolation: true|sandbox: true|webSecurity: true' src/main/index.ts
if rg -n '@smallwei/avue|from "@smallwei/avue"' package.json pnpm-lock.yaml src; then exit 1; else echo 'Avue runtime references: none'; fi
git -C ../personnel-archive-desktop status --short
git status --short
git rev-parse b-series-v1-before-list-redesign^{commit}
git rev-parse 535845a^{commit}
```

Expected: all four Electron settings remain; Avue is absent; the sibling original client has no new task changes; the two tag resolutions are identical.

Inspect these fresh screenshots:

```text
output/b-series/personnel-empty-1440.png
output/b-series/personnel-active-1440.png
output/b-series/personnel-1080.png
```

Expected: the sidebar card and personnel directory are gone, the dossier fills the released width, the list and content columns align, and the 1080px page has no workspace-level horizontal overflow.

- [ ] **Step 5: Commit child documentation**

```bash
git add AGENTS.md
git commit -m "docs(desktop): document simplified personnel desk"
```

The root is not Git-initialized, so `../CODE_GUIDE.md` remains a synchronized workspace document outside the child commit.

- [ ] **Step 6: Confirm clean final state**

Run:

```bash
git status --short
git log --oneline --decorate -8
```

Expected: the B child worktree is clean and the design, shell, personnel, and documentation commits appear after `8310c7b` without rewriting the saved B-series history.
