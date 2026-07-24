# Full-Width Dossier Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the dossier preview's fixed `520px` ceiling so it can expand across the personnel workbench while the list smoothly contracts to zero.

**Architecture:** Keep resize ownership inside `PersonPreviewDock.vue`. Find its nearest workbench, measure it with `ResizeObserver`, derive the maximum from the workbench content width minus the CSS-owned open gap, and clamp only when the container becomes smaller; `PersonListPage.vue` continues retaining the latest width snapshot for the current page lifecycle.

**Tech Stack:** Vue 3 Composition API, TypeScript strict mode, CSS Grid, Pointer Events, ResizeObserver, Vitest/Vue Test Utils, Playwright Electron.

## Global Constraints

- Do not add a package dependency or persist the chosen preview width.
- Preview width defaults to `320px`, has a `280px` minimum, and has no fixed pixel maximum.
- The dynamic maximum equals the current workbench content width minus its configured open column gap.
- Container shrink clamps an oversized preview; container growth raises only the maximum and does not enlarge the preview automatically.
- Pointer resize, `16px` keyboard steps, the `220ms` motion, close cleanup, and the `1280px` stacked fallback remain unchanged.
- The list may shrink to zero; batch selection remains independent from preview selection.

---

### Task 1: Dynamic workbench-bound preview width

**Files:**
- Modify: `src/renderer/features/person-list/PersonPreviewDock.vue`
- Modify: `src/renderer/src/styles/archive-workbench/lists.css`
- Test: `tests/unit/person-preview-dock.test.ts`

**Interfaces:**
- Consumes: the dock root's parent `.person-workbench`, its `clientWidth`, and CSS custom property `--person-workbench-open-gap`.
- Produces: reactive `maxWidth`, `aria-valuemax`, and `ResizeObserver` cleanup on unmount.

- [ ] **Step 1: Write failing dynamic-bound tests**

Mount the dock in a host whose `clientWidth` and `--person-workbench-open-gap` are controlled by the test. Stub `ResizeObserver` so the test can trigger a container-size update:

```ts
let workbenchWidth = 900
let resizeCallback: ResizeObserverCallback | undefined

class ResizeObserverStub {
  constructor(callback: ResizeObserverCallback) {
    resizeCallback = callback
  }
  observe(): void {}
  disconnect(): void {}
}

function mountDockInWorkbench(initialWidth?: number) {
  const workbench = document.createElement("div")
  workbench.style.setProperty("--person-workbench-open-gap", "18px")
  Object.defineProperty(workbench, "clientWidth", { get: () => workbenchWidth })
  document.body.append(workbench)
  return {
    workbench,
    wrapper: mount(PersonPreviewDock, {
      attachTo: workbench,
      props: { state: LOADING_PREVIEW, openingPersonId: null, initialWidth },
      global: { plugins: [ElementPlus] },
    }),
  }
}
```

Assert that a left drag reaches `620px`, can clamp at `882px` instead of `520px`, updates `aria-valuemax`, and that changing `workbenchWidth` to `600` plus invoking `resizeCallback` clamps the current width to `582px`. Then expand to `1200px` and assert the current width remains `582px` while the maximum becomes `1182px`.

- [ ] **Step 2: Run the focused test and verify the legacy ceiling fails**

Run:

```bash
pnpm vitest run tests/unit/person-preview-dock.test.ts
```

Expected: FAIL because the current component reports and clamps to `520` and does not observe the host.

- [ ] **Step 3: Replace the fixed ceiling with measured available width**

In `PersonPreviewDock.vue`, add a root element ref, dynamic maximum, observer lifecycle, and one measurement function:

```ts
import { computed, onBeforeUnmount, onMounted, ref } from "vue"

const PREVIEW_WIDTH = { default: 320, min: 280, keyboardStep: 16 } as const
const initialWidth = Math.max(PREVIEW_WIDTH.min, props.initialWidth ?? PREVIEW_WIDTH.default)
const width = ref(initialWidth)
const maxWidth = ref(Math.max(initialWidth, window.innerWidth))
const dockElement = ref<HTMLElement | null>(null)
let workbenchResizeObserver: ResizeObserver | null = null

function configuredOpenGap(workbench: HTMLElement): number {
  const value = Number.parseFloat(
    window.getComputedStyle(workbench).getPropertyValue("--person-workbench-open-gap"),
  )
  return Number.isFinite(value) ? value : 0
}

function syncWorkbenchWidth(workbench: HTMLElement): void {
  const available = Math.floor(workbench.clientWidth - configuredOpenGap(workbench))
  if (available <= 0) return
  maxWidth.value = Math.max(PREVIEW_WIDTH.min, available)
  if (width.value > maxWidth.value) setWidth(maxWidth.value)
}

onMounted(() => {
  const workbench = dockElement.value?.closest<HTMLElement>(".person-workbench")
  if (!workbench) return
  syncWorkbenchWidth(workbench)
  if (typeof ResizeObserver === "undefined") return
  workbenchResizeObserver = new ResizeObserver(() => syncWorkbenchWidth(workbench))
  workbenchResizeObserver.observe(workbench)
})

onBeforeUnmount(() => workbenchResizeObserver?.disconnect())
```

Change `clampWidth()` to use `maxWidth.value`, bind `ref="dockElement"` on the root, and bind `:aria-valuemax="maxWidth"` on the separator. Keep `setWidth()` as the single mutation/emission path.

In `lists.css`, define the gap once and consume it in the open state:

```css
.person-workbench {
  --person-workbench-open-gap: 18px;
}

.person-workbench.is-preview-open {
  column-gap: var(--person-workbench-open-gap);
}
```

- [ ] **Step 4: Run focused tests and type checking**

Run:

```bash
pnpm vitest run tests/unit/person-preview-dock.test.ts tests/unit/person-list-avue.test.ts tests/unit/archive-workbench-layout.test.ts
pnpm typecheck
```

Expected: all commands PASS; width exceeds `520px`, clamps to the measured host, and existing close/reopen behavior remains intact.

---

### Task 2: End-to-end geometry and documentation

**Files:**
- Modify: `tests/e2e/archive-detail.spec.ts`
- Modify: `AGENTS.md`
- Modify outside the desktop Git root: `../CODE_GUIDE.md`

**Interfaces:**
- Consumes: accessible separator name `调整卷宗预览宽度`, `.person-workbench`, `.person-list-card`, and `.person-preview`.
- Produces: browser-level evidence that the preview passes `520px` and the list can approach zero width.

- [ ] **Step 1: Strengthen the existing Electron drag assertion**

Wait for the `220ms` entry transition to settle at `320px`, perform an `80px` real pointer drag, and assert that `aria-valuenow` increases. Then use repeated `ArrowLeft` input on the same separator until its dynamic ARIA maximum is reached and assert:

```ts
await expect.poll(async () => Math.round(await elementWidth(preview))).toBe(320)
await dragLeft(page, separator, 80)
await expect
  .poll(async () => Number(await separator.getAttribute("aria-valuenow")))
  .toBeGreaterThan(320)
await expandToMaximum(separator)
await expect.poll(() => elementWidth(preview)).toBeGreaterThan(520)
await expect.poll(() => elementWidth(listCard)).toBeLessThanOrEqual(2)
```

The focused unit test remains responsible for proving that one pointer resize can cross `520px` and clamp directly at the measured maximum. Retain the existing close, full-list restoration, reopen-width retention, masked-field, sticky-navigation, page-error, and request-failure assertions.

- [ ] **Step 2: Synchronize authoritative documentation**

Update `AGENTS.md` and `../CODE_GUIDE.md` to replace every `280–520px` statement with: default `320px`, minimum `280px`, dynamic workbench-bound maximum, responsive container-shrink clamping, and `1280px` stacked fallback. Preserve unrelated user edits.

- [ ] **Step 3: Run Electron coverage in the active desktop session**

Run:

```bash
pnpm test:e2e -- archive-detail.spec.ts
```

Expected: PASS with a preview wider than `520px`, a fully contracted list, successful close/reopen, and flush detail navigation.

---

### Task 3: Full verification and atomic commits

**Files:**
- Verify all Task 1–2 paths and the pre-existing row-only preview-entry changes.

**Interfaces:**
- Consumes: all prior task outputs.
- Produces: passing baseline, whitespace-clean diffs, and scoped commits that omit user-owned untracked directories.

- [ ] **Step 1: Run the complete client baseline**

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Expected: all four commands exit `0`.

- [ ] **Step 2: Inspect scope and documentation consistency**

```bash
git diff --check
git status --short
rg -n "280.*520|520px|fixed maximum" AGENTS.md ../CODE_GUIDE.md src tests
```

Expected: no stale implemented-behavior ceiling remains; `design-previews/central-enterprise-office-v2/` and `output/` remain untouched and untracked.

- [ ] **Step 3: Commit the row-only entry and full-width resize in separate units**

Stage only the already-verified row-only source/test/docs paths for one commit, then stage the dynamic resize source/test/docs paths for a second commit. Never stage `design-previews/` or `output/`.
