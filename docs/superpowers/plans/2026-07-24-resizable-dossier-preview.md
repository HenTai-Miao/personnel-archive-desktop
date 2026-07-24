# Resizable Dossier Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the personnel dossier preview default-hidden, animated, closable, and horizontally resizable while making the complete-detail index sit flush against the workspace scroll edge.

**Architecture:** Keep data loading and resource cleanup in the existing `usePersonPreview()` composable. Derive drawer visibility from its existing `idle`/non-`idle` state in `PersonListPage.vue`, retain only the latest width snapshot for that page lifecycle, and isolate active resize state plus accessible separator behavior in `PersonPreviewDock.vue`. Expose a single `close` event from `PersonArchivePreview.vue`, use CSS Grid plus Vue Transition for coordinated list/drawer motion, and fix sticky positioning with an inherited workspace-padding custom property instead of scroll listeners.

**Tech Stack:** Vue 3 Composition API, TypeScript strict mode, Element Plus, CSS Grid/Pointer Events, Vitest/Vue Test Utils, Playwright Electron.

**Execution adjustment:** The resize state described later in the original task steps was extracted from `PersonListPage.vue` into `PersonPreviewDock.vue` to keep each production component below the project's 250-line hard ceiling. The behavior, bounds, event contract, and test coverage are unchanged.

## Global Constraints

- Do not add a package dependency or persist the chosen preview width.
- Preview width defaults to `320px`, clamps to `280px`–`520px`, and keyboard adjustment uses `16px` steps.
- Drawer/list animation duration is `220ms`; entry moves right-to-left and exit moves left-to-right.
- At viewport widths of `1280px` or less, preserve the existing stacked preview layout and hide the resize separator.
- Closing must call the existing `preview.clear()` path so in-flight responses are invalidated and temporary photo Object URLs are revoked.
- Batch selection must remain independent from preview selection.
- Respect `prefers-reduced-motion: reduce` through the theme's existing global transition override.
- Preserve the pre-existing uncommitted edits in `AGENTS.md`, `AppShell.vue`, `theme.css`, `tests/e2e/archive-detail.spec.ts`, and `tests/unit/app-shell.test.ts`; never revert or silently commit them.

---

### Task 1: Default-hidden drawer and explicit close lifecycle

**Files:**
- Modify: `src/renderer/features/person-list/PersonListPage.vue`
- Modify: `src/renderer/features/person-list/PersonArchivePreview.vue`
- Test: `tests/unit/person-list-avue.test.ts`

**Interfaces:**
- Consumes: `PersonPreviewState` and `usePersonPreview().clear(): void`.
- Produces: `isPreviewOpen: ComputedRef<boolean>` and `PersonArchivePreview` event `close: []`.

- [ ] **Step 1: Write failing component tests for initial absence and close cleanup**

Add the initial absence assertions immediately after `mountPage()` in the existing explicit-preview test, then add the close test below it:

```ts
expect(apiMocks.getPerson).not.toHaveBeenCalled()
expect(wrapper.find('[data-test="person-preview"]').exists()).toBe(false)
expect(wrapper.get('[data-test="row-class"]').text()).toBe("")
```

```ts
it("closes the dossier preview and clears its active row", async () => {
  vi.mocked(fetchPersons).mockResolvedValue(PERSON_PAGE)
  apiMocks.getPerson.mockResolvedValue({ ...PERSON_DETAIL_FIXTURE, id: PERSON.id })
  const wrapper = await mountPage()
  await wrapper.get('[data-test="preview-person"]').trigger("click")
  await flushPromises()

  await wrapper.get('[aria-label="关闭卷宗预览"]').trigger("click")
  await flushPromises()

  expect(wrapper.find('[data-test="person-preview"]').exists()).toBe(false)
  expect(wrapper.get('[data-test="row-class"]').text()).toBe("")
  wrapper.unmount()
})
```

Update the filter-reset test's final preview assertion from idle copy to DOM absence:

```ts
expect(wrapper.find('[data-test="person-preview"]').exists()).toBe(false)
expect(wrapper.get('[data-test="row-class"]').text()).toBe("")
```

- [ ] **Step 2: Run the targeted test and verify the new expectations fail**

Run:

```bash
pnpm vitest run tests/unit/person-list-avue.test.ts
```

Expected: FAIL because the idle preview is still rendered and no “关闭卷宗预览” control exists.

- [ ] **Step 3: Add one close event and one persistent close control to the preview component**

In `PersonArchivePreview.vue`, import `Close`, add the emit signature, and place the button as the first child of `<aside>`:

```ts
import { Close } from "@element-plus/icons-vue"
```

```ts
const emit = defineEmits<{
  close: []
  retry: [personId: PersonId]
  retryPhoto: []
  view: [personId: PersonId]
  exportPerson: [person: PersonDetail]
}>()
```

```vue
<el-button
  class="preview-close"
  circle
  :icon="Close"
  aria-label="关闭卷宗预览"
  title="关闭卷宗预览"
  @click="emit('close')"
/>
```

- [ ] **Step 4: Derive visibility from the existing preview state and conditionally render the drawer**

In `PersonListPage.vue`, add the computed value:

```ts
const isPreviewOpen = computed(() => preview.state.value.kind !== "idle")
```

Replace the unconditional preview component with this transition block and route all clearing through `closePreview()`:

```ts
function closePreview(): void {
  preview.clear()
}
```

```vue
<Transition name="dossier-preview">
  <div v-if="isPreviewOpen" class="person-preview-dock" data-test="person-preview-dock">
    <PersonArchivePreview
      :state="preview.state.value"
      :opening-person-id="openingPersonId"
      @close="closePreview"
      @retry="preview.select"
      @retry-photo="preview.retryPhoto"
      @view="viewDetail"
      @export-person="openArchive"
    />
  </div>
</Transition>
```

Use `closePreview()` in `loadPage()` and `resetFilters()` so filter/reset/pagination all trigger the same lifecycle.

- [ ] **Step 5: Run the focused tests and verify they pass**

Run:

```bash
pnpm vitest run tests/unit/person-list-avue.test.ts tests/unit/person-preview.test.ts
```

Expected: both files PASS; initial load performs no detail/photo request, and closing clears the highlighted row.

- [ ] **Step 6: Commit only the clean Task 1 paths**

```bash
git add src/renderer/features/person-list/PersonListPage.vue src/renderer/features/person-list/PersonArchivePreview.vue tests/unit/person-list-avue.test.ts
git diff --cached --check
git commit -m "feat(desktop): hide and close dossier preview"
```

---

### Task 2: Resizable split pane and coordinated motion

**Files:**
- Modify: `src/renderer/features/person-list/PersonListPage.vue`
- Modify: `src/renderer/src/styles/archive-workbench/lists.css`
- Modify: `src/renderer/src/styles/archive-workbench/preview.css`
- Test: `tests/unit/person-list-avue.test.ts`
- Create: `tests/unit/archive-workbench-layout.test.ts`

**Interfaces:**
- Consumes: `isPreviewOpen` and `.person-preview-dock` from Task 1.
- Produces: `previewWidth: Ref<number>`, `previewWorkbenchStyle`, pointer handlers, keyboard handler, and separator ARIA values.

- [ ] **Step 1: Write failing resize behavior tests**

Add this test after the close test in `person-list-avue.test.ts`:

```ts
it("resizes the open preview with pointer and keyboard input within its bounds", async () => {
  vi.mocked(fetchPersons).mockResolvedValue(PERSON_PAGE)
  apiMocks.getPerson.mockResolvedValue({ ...PERSON_DETAIL_FIXTURE, id: PERSON.id })
  const wrapper = await mountPage()
  await wrapper.get('[data-test="preview-person"]').trigger("click")
  await flushPromises()
  const separator = wrapper.get('[data-test="person-preview-resizer"]')

  await separator.trigger("pointerdown", { pointerId: 1, clientX: 500 })
  await separator.trigger("pointermove", { pointerId: 1, clientX: 420 })
  expect(separator.attributes("aria-valuenow")).toBe("400")
  expect(wrapper.get(".person-workbench").attributes("style")).toContain(
    "--person-preview-width: 400px",
  )

  await separator.trigger("pointermove", { pointerId: 1, clientX: -1000 })
  expect(separator.attributes("aria-valuenow")).toBe("520")
  await separator.trigger("pointermove", { pointerId: 1, clientX: 1000 })
  expect(separator.attributes("aria-valuenow")).toBe("280")
  await separator.trigger("pointerup", { pointerId: 1 })

  await separator.trigger("keydown", { key: "ArrowLeft" })
  expect(separator.attributes("aria-valuenow")).toBe("296")
  await separator.trigger("keydown", { key: "ArrowRight" })
  expect(separator.attributes("aria-valuenow")).toBe("280")
  wrapper.unmount()
})
```

- [ ] **Step 2: Write a failing CSS contract test for the split and motion rules**

Create `tests/unit/archive-workbench-layout.test.ts`:

```ts
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

function readStyle(relativePath: string): string {
  return readFileSync(new URL(`../../src/renderer/src/styles/archive-workbench/${relativePath}`, import.meta.url), "utf8")
}

describe("archive workbench layout styles", () => {
  it("animates the list and preview as a two-column drawer", () => {
    const lists = readStyle("lists.css")
    const preview = readStyle("preview.css")
    expect(lists).toMatch(/grid-template-columns:\s*minmax\(0, 1fr\) 0/)
    expect(lists).toContain("--person-preview-width: 320px")
    expect(lists).toMatch(/\.person-workbench\.is-preview-open[\s\S]*var\(--person-preview-width\)/)
    expect(lists).toContain("220ms")
    expect(preview).toMatch(/\.dossier-preview-enter-from[\s\S]*translateX/)
    expect(preview).toMatch(/\.dossier-preview-leave-to[\s\S]*translateX/)
    expect(preview).toMatch(/@media \(max-width: 1280px\)[\s\S]*person-preview-resizer[\s\S]*display:\s*none/)
  })
})
```

- [ ] **Step 3: Run both focused tests and verify failures**

Run:

```bash
pnpm vitest run tests/unit/person-list-avue.test.ts tests/unit/archive-workbench-layout.test.ts
```

Expected: FAIL because the separator, width style, and motion CSS do not exist.

- [ ] **Step 4: Add clamped pointer and keyboard resize state to `PersonListPage.vue`**

Add the constants/state and handlers below the existing refs:

```ts
const PREVIEW_DEFAULT_WIDTH = 320
const PREVIEW_MIN_WIDTH = 280
const PREVIEW_MAX_WIDTH = 520
const PREVIEW_KEYBOARD_STEP = 16
const previewWidth = ref(PREVIEW_DEFAULT_WIDTH)
const previewResizing = ref(false)
let previewResizePointerId: number | null = null
let previewResizeStartX = 0
let previewResizeStartWidth = PREVIEW_DEFAULT_WIDTH

const previewWorkbenchStyle = computed<Record<string, string>>(() => ({
  "--person-preview-width": `${previewWidth.value}px`,
}))

function clampPreviewWidth(width: number): number {
  return Math.min(PREVIEW_MAX_WIDTH, Math.max(PREVIEW_MIN_WIDTH, width))
}

function beginPreviewResize(event: PointerEvent): void {
  previewResizePointerId = event.pointerId
  previewResizeStartX = event.clientX
  previewResizeStartWidth = previewWidth.value
  previewResizing.value = true
  const target = event.currentTarget
  if (target instanceof HTMLElement && typeof target.setPointerCapture === "function") {
    target.setPointerCapture(event.pointerId)
  }
}

function resizePreview(event: PointerEvent): void {
  if (event.pointerId !== previewResizePointerId) return
  previewWidth.value = clampPreviewWidth(
    previewResizeStartWidth + previewResizeStartX - event.clientX,
  )
}

function endPreviewResize(event: PointerEvent): void {
  if (event.pointerId !== previewResizePointerId) return
  const target = event.currentTarget
  if (
    target instanceof HTMLElement &&
    typeof target.hasPointerCapture === "function" &&
    typeof target.releasePointerCapture === "function" &&
    target.hasPointerCapture(event.pointerId)
  ) {
    target.releasePointerCapture(event.pointerId)
  }
  previewResizePointerId = null
  previewResizing.value = false
}

function resizePreviewFromKeyboard(event: KeyboardEvent): void {
  const delta =
    event.key === "ArrowLeft"
      ? PREVIEW_KEYBOARD_STEP
      : event.key === "ArrowRight"
        ? -PREVIEW_KEYBOARD_STEP
        : 0
  if (delta === 0) return
  event.preventDefault()
  previewWidth.value = clampPreviewWidth(previewWidth.value + delta)
}
```

Reset `previewResizing` and `previewResizePointerId` inside `closePreview()` before calling `preview.clear()`.

- [ ] **Step 5: Bind the grid state and accessible separator in the template**

Change the workbench opening tag and add the separator before `PersonArchivePreview`:

```vue
<div
  v-else-if="store.results.length"
  class="person-workbench"
  :class="{
    'is-preview-open': isPreviewOpen,
    'is-preview-resizing': previewResizing,
  }"
  :style="previewWorkbenchStyle"
>
```

```vue
<div
  class="person-preview-resizer"
  data-test="person-preview-resizer"
  role="separator"
  tabindex="0"
  aria-label="调整卷宗预览宽度"
  aria-orientation="vertical"
  :aria-valuemin="PREVIEW_MIN_WIDTH"
  :aria-valuemax="PREVIEW_MAX_WIDTH"
  :aria-valuenow="previewWidth"
  @pointerdown="beginPreviewResize"
  @pointermove="resizePreview"
  @pointerup="endPreviewResize"
  @pointercancel="endPreviewResize"
  @keydown="resizePreviewFromKeyboard"
/>
```

- [ ] **Step 6: Add the two-column transition and responsive fallback styles**

In `lists.css`, replace the current fixed `grid-template-columns`/`gap` rules on `.person-workbench` with:

```css
.person-workbench {
  --person-preview-width: 320px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 0;
  column-gap: 0;
  align-items: start;
  transition:
    grid-template-columns 220ms cubic-bezier(0.22, 1, 0.36, 1),
    column-gap 220ms cubic-bezier(0.22, 1, 0.36, 1);
}

.person-workbench.is-preview-open {
  grid-template-columns: minmax(0, 1fr) var(--person-preview-width);
  column-gap: 18px;
}

.person-workbench.is-preview-resizing {
  user-select: none;
  transition: none;
}
```

At the existing `max-width: 1280px` media query, use one column for both states and an 18px row gap only while open:

```css
.person-workbench,
.person-workbench.is-preview-open {
  grid-template-columns: minmax(0, 1fr);
  column-gap: 0;
}

.person-workbench.is-preview-open {
  row-gap: 18px;
}
```

In `preview.css`, add dock, separator, close button, enter/leave, and narrow-screen rules:

```css
.person-preview-dock {
  position: relative;
  min-width: 0;
}

.person-preview-resizer {
  position: absolute;
  z-index: 6;
  top: 0;
  bottom: 0;
  left: -9px;
  width: 18px;
  cursor: col-resize;
  touch-action: none;
}

.person-preview-resizer::before {
  position: absolute;
  top: 12px;
  bottom: 12px;
  left: 8px;
  width: 2px;
  background: var(--archive-line-strong);
  border-radius: 2px;
  content: "";
  transition: background 120ms ease;
}

.person-preview-resizer:hover::before,
.person-preview-resizer:focus-visible::before {
  background: var(--archive-blue);
}

.preview-close {
  position: absolute;
  z-index: 7;
  top: 10px;
  right: 10px;
}

.preview-heading,
.preview-state {
  padding-right: 52px;
}

.dossier-preview-enter-active,
.dossier-preview-leave-active {
  transition:
    transform 220ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 180ms ease;
}

.dossier-preview-enter-from,
.dossier-preview-leave-to {
  opacity: 0;
  transform: translateX(calc(100% + 18px));
}
```

```css
@media (max-width: 1280px) {
  .person-preview-resizer {
    display: none;
  }
}
```

- [ ] **Step 7: Run focused tests, type checking, and lint**

Run:

```bash
pnpm vitest run tests/unit/person-list-avue.test.ts tests/unit/person-preview.test.ts tests/unit/archive-workbench-layout.test.ts
pnpm typecheck
pnpm lint
```

Expected: all commands exit `0`; the resize test reports `280`, `296`, `400`, and `520` at the expected points.

- [ ] **Step 8: Commit the resizable split pane**

```bash
git add src/renderer/features/person-list/PersonListPage.vue src/renderer/src/styles/archive-workbench/lists.css src/renderer/src/styles/archive-workbench/preview.css tests/unit/person-list-avue.test.ts tests/unit/archive-workbench-layout.test.ts
git diff --cached --check
git commit -m "feat(desktop): resize dossier preview drawer"
```

---

### Task 3: Flush sticky detail navigation

**Files:**
- Modify: `src/renderer/src/styles/archive-workbench/shell.css`
- Modify: `src/renderer/src/styles/archive-workbench/detail.css`
- Test: `tests/unit/archive-workbench-layout.test.ts`

**Interfaces:**
- Produces: inherited CSS custom property `--archive-workspace-block-start` with values `24px` and `20px`.
- Consumes: `.dossier-index` sticky positioning and the existing `54px` section scroll margin.

- [ ] **Step 1: Add failing CSS contract assertions for the workspace offset**

Extend `archive-workbench-layout.test.ts`:

```ts
it("offsets the sticky detail index by the workspace top padding", () => {
  const shell = readStyle("shell.css")
  const detail = readStyle("detail.css")
  expect(shell).toMatch(/\.paper-workspace[\s\S]*--archive-workspace-block-start:\s*24px/)
  expect(shell).toMatch(/@media \(max-width: 1280px\)[\s\S]*--archive-workspace-block-start:\s*20px/)
  expect(detail).toContain("top: calc(-1 * var(--archive-workspace-block-start));")
  expect(detail).toContain("scroll-margin-top: 54px")
})
```

- [ ] **Step 2: Run the style test and verify it fails for the missing custom property**

Run:

```bash
pnpm vitest run tests/unit/archive-workbench-layout.test.ts
```

Expected: FAIL because neither the workspace variable nor the negative sticky offset exists.

- [ ] **Step 3: Expose the workspace padding and consume it in the sticky index**

In `shell.css`, add the variable without changing the effective padding:

```css
.paper-workspace {
  --archive-workspace-block-start: 24px;
  grid-area: workspace;
  min-width: 0;
  overflow: auto;
  padding: var(--archive-workspace-block-start) 24px 30px;
  background: var(--archive-canvas);
}
```

Update the existing narrow-screen rule:

```css
@media (max-width: 1280px) {
  .paper-workspace {
    --archive-workspace-block-start: 20px;
    padding: var(--archive-workspace-block-start) 20px 26px;
  }
}
```

In `detail.css`, replace `top: 0` on `.dossier-index` with:

```css
top: calc(-1 * var(--archive-workspace-block-start));
```

- [ ] **Step 4: Run the focused style test and full archive-detail unit test**

Run:

```bash
pnpm vitest run tests/unit/archive-workbench-layout.test.ts tests/unit/archive-detail.test.ts
pnpm typecheck
```

Expected: all commands PASS; detail navigation labels and existing family-member scrolling remain intact.

- [ ] **Step 5: Commit the sticky offset fix**

```bash
git add src/renderer/src/styles/archive-workbench/shell.css src/renderer/src/styles/archive-workbench/detail.css tests/unit/archive-workbench-layout.test.ts
git diff --cached --check
git commit -m "fix(desktop): align sticky detail navigation"
```

---

### Task 4: Electron path coverage and project documentation

**Files:**
- Modify carefully without discarding existing edits: `tests/e2e/archive-detail.spec.ts`
- Modify carefully without discarding existing edits: `AGENTS.md`
- Modify outside the desktop Git root: `../CODE_GUIDE.md`

**Interfaces:**
- Consumes: accessibility names “调整卷宗预览宽度” and “关闭卷宗预览”, `.person-list-card`, `.person-preview`, `.paper-workspace`, and `.dossier-index`.
- Produces: end-to-end geometry assertions and synchronized implementation-status documentation.

- [ ] **Step 1: Extend the existing Electron flow without removing its uncommitted button-color assertions**

Before clicking “预览”, assert that the drawer is absent and capture the full list width:

```ts
const preview = page.locator('[data-test="person-preview"]')
const listCard = page.locator(".person-list-card")
await expect(preview).toHaveCount(0)
const initialListBox = await listCard.boundingBox()
if (initialListBox === null) throw new Error("expected personnel list to be visible")
await page.getByRole("button", { name: "预览", exact: true }).click()
```

After the existing masked-value and primary-button color assertions, verify reflow, drag, close, and reopen:

```ts
await expect.poll(async () => (await listCard.boundingBox())?.width ?? 0).toBeLessThan(
  initialListBox.width - 200,
)
const separator = page.getByRole("separator", { name: "调整卷宗预览宽度" })
const previewBeforeDrag = await preview.boundingBox()
const separatorBox = await separator.boundingBox()
if (previewBeforeDrag === null || separatorBox === null) {
  throw new Error("expected open preview and resize separator")
}
await page.mouse.move(separatorBox.x + separatorBox.width / 2, separatorBox.y + 80)
await page.mouse.down()
await page.mouse.move(separatorBox.x - 80, separatorBox.y + 80)
await page.mouse.up()
await expect.poll(async () => (await preview.boundingBox())?.width ?? 0).toBeGreaterThan(
  previewBeforeDrag.width + 60,
)

await page.getByRole("button", { name: "关闭卷宗预览" }).click()
await expect(preview).toHaveCount(0)
await expect.poll(async () => Math.round((await listCard.boundingBox())?.width ?? 0)).toBe(
  Math.round(initialListBox.width),
)
await page.getByRole("button", { name: "预览", exact: true }).click()
await expect(preview).toBeVisible()
```

After clicking “学历教育” on the complete detail page, assert the sticky edge:

```ts
const workspace = page.locator(".paper-workspace")
const detailIndex = page.locator(".dossier-index")
await expect.poll(async () => {
  const workspaceBox = await workspace.boundingBox()
  const indexBox = await detailIndex.boundingBox()
  if (workspaceBox === null || indexBox === null) return Number.NaN
  return Math.round(indexBox.y - workspaceBox.y)
}).toBe(0)
```

- [ ] **Step 2: Update the authoritative status descriptions**

In `AGENTS.md`, change the fixed-preview paragraph to state that the 1440px workbench starts with the list full-width; explicit selection opens a 320px right drawer, the drawer clamps to 280px–520px, provides pointer/keyboard resizing and a close action, and still stacks below the list at 1280px or less. Amend the theme paragraph to say the sticky detail navigation compensates for workspace padding and sits flush at the scroll edge.

In `../CODE_GUIDE.md`, update the `PersonListPage.vue`, `PersonArchivePreview.vue`, `styles/archive-workbench/{lists,preview,...}`, and end-to-end flow entries with the same implemented behavior. Preserve every unrelated source-map and security statement.

- [ ] **Step 3: Inspect the pre-existing diffs before staging anything**

Run:

```bash
git diff -- AGENTS.md tests/e2e/archive-detail.spec.ts
git status --short
```

Expected: the diff still contains the pre-existing hidden folder-settings status and primary-button color assertions in addition to this task's changes. Do not stage or commit those two files as a whole; leave their combined worktree changes intact and report them in the final handoff.

- [ ] **Step 4: Run E2E only where Electron is permitted**

First inspect the host:

```bash
printenv CODEX_SANDBOX
```

If it prints `seatbelt`, run the launch-policy regression instead:

```bash
pnpm vitest run tests/unit/electron-e2e-launch-policy.test.ts
```

Expected: PASS and no Electron process is created.

From a normal desktop terminal or Windows CI, run:

```bash
pnpm test:e2e -- archive-detail.spec.ts
```

Expected: PASS with the preview hidden/open/resized/closed/reopened path and a zero-pixel sticky navigation gap.

---

### Task 5: Full verification and final review

**Files:**
- Verify all changed files from Tasks 1–4.
- Reconcile: `AGENTS.md`, `../AGENTS.md`, and `../CODE_GUIDE.md`.

**Interfaces:**
- Consumes: all prior task outputs.
- Produces: evidence-backed completion report with any host-limited E2E caveat.

- [ ] **Step 1: Run the complete client verification baseline**

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Expected: all four commands exit `0`.

- [ ] **Step 2: Inspect scoped diffs and whitespace**

```bash
git diff --check
git diff -- src/renderer/features/person-list/PersonListPage.vue src/renderer/features/person-list/PersonArchivePreview.vue src/renderer/src/styles/archive-workbench/lists.css src/renderer/src/styles/archive-workbench/preview.css src/renderer/src/styles/archive-workbench/shell.css src/renderer/src/styles/archive-workbench/detail.css tests/unit/person-list-avue.test.ts tests/unit/archive-workbench-layout.test.ts tests/e2e/archive-detail.spec.ts AGENTS.md
git status --short
```

Expected: no whitespace errors; no source, test, or documentation change outside the approved scope; pre-existing uncommitted edits remain present.

- [ ] **Step 3: Reconcile implementation-status documentation**

Read the current behavior statements in all three knowledge-base files and confirm they describe default-hidden preview, explicit open, close/resource cleanup, 280px–520px resizing, 1280px stacked fallback, and flush sticky navigation. Correct only affected descriptions.

- [ ] **Step 4: Report results without claiming unavailable Electron evidence**

State the exact passing commands, list the implementation files, and explicitly distinguish an E2E pass from a Seatbelt-policy-only pass. Mention that `AGENTS.md` and `tests/e2e/archive-detail.spec.ts` retain pre-existing user edits and were intentionally not committed wholesale.
