# Import Field Issues Dialog Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make field-validation failures actionable while ensuring the modal overlay always sits above the app shell, striped rows, and fixed table columns.

**Architecture:** `ImportResultMessage` becomes a row-level summary/emitter only. Each result panel owns one reusable `ImportFieldIssuesDialog`, which is teleported to `document.body`; status presentation maps the stable field-validation code to the non-technical “需修正” state while preserving `FAILED` for protocol and persistence semantics.

**Tech Stack:** Vue 3, TypeScript, Element Plus 2.11, Pinia, Vitest, Vue Test Utils, Playwright Electron, B-series CSS.

**Repository note:** Run these commands from the `personnel-archive-desktop-b` Git repository. Commit and push steps remain outside this implementation plan.

---

## File Structure

- Create `src/renderer/features/archive-import/ImportFieldIssuesDialog.vue`: one reusable, body-teleported modal for a file name and the server-provided safe multiline issue message, with explicit copy and close actions.
- Modify `src/renderer/features/archive-import/ImportResultMessage.vue`: keep the first-line summary and emit a typed `show-issues` event; remove per-row dialog state.
- Modify `src/renderer/features/archive-import/ImportPage.vue`: own one current-batch issue dialog and map item status with the stable result code.
- Modify `src/renderer/features/archive-import/ImportHistoryPanel.vue`: own one history issue dialog and map item status with the stable result code.
- Modify `src/renderer/features/archive-import/status-presentation.ts`: add field-validation-aware row and batch presentation without changing API statuses.
- Modify `src/renderer/features/archive-import/store.ts`: feed complete items into batch presentation and show a correction-oriented batch message.
- Modify `src/renderer/src/styles/dossier-reading-desk/workflow.css`: add scoped overlay/dialog/list/footer styles and make the table summary two-line readable.
- Modify `tests/unit/import-field-validation-details.test.ts`: lock body teleport, shared-dialog content, explicit close, and exact multiline preservation.
- Modify `tests/unit/import-list-pagination.test.ts`: distinguish ordinary failures from field-validation rows displayed as “需修正”.
- Create `tests/e2e/import-field-issues-dialog.spec.ts`: use a real Element Plus table in Electron and verify pointer hit-testing over shell, striped rows, and fixed columns resolves to the overlay.
- Modify `CODE_GUIDE.md` and `personnel-archive-desktop-b/AGENTS.md`: document the shared dialog, presentation semantics, and E2E contract.

## Task 1: Add failing component and presentation tests

- [ ] **Step 1: Change the field-details component test to assert a body-level modal**

After clicking the row action, assert the overlay is a direct body child, the dialog includes the workbook name and all server lines, the copy action writes the unchanged multiline message, and clicking the footer close button removes the visible dialog:

```ts
const overlay = document.body.querySelector(":scope > .el-overlay")
expect(overlay).not.toBeNull()
expect(overlay?.textContent).toContain("字段失败.xlsx")
expect(overlay?.textContent).toContain("基本情况!D41")
await wrapper.get('[data-test="copy-import-field-issues"]').trigger("click")
expect(writeText).toHaveBeenCalledWith(fullMessage)
await wrapper.get('[data-test="close-import-field-issues"]').trigger("click")
expect(document.body.querySelector(".import-field-issues-dialog")).toBeNull()
```

- [ ] **Step 2: Add status-presentation assertions**

Create current rows whose protocol status remains `FAILED` and whose code is `IMPORT_FIELD_VALIDATION_FAILED`; assert the row label is `需修正`, batch text is `2 份待修正`, and ordinary failed codes still show `全部失败`.

- [ ] **Step 3: Run focused unit tests and verify RED**

Run:

```bash
pnpm vitest run tests/unit/import-field-validation-details.test.ts tests/unit/import-list-pagination.test.ts
```

Expected: failures because the overlay is still nested per row, the file name/footer are absent, and code-aware status presentation does not exist.

## Task 2: Implement the shared body-level dialog

- [ ] **Step 1: Create `ImportFieldIssuesDialog.vue`**

The component contract is:

```ts
const props = defineProps<{
  readonly modelValue: boolean
  readonly fileName: string
  readonly message: string
}>()
const emit = defineEmits<{
  "update:modelValue": [value: boolean]
}>()
```

The Element Plus dialog must use `append-to-body`, `modal-class="import-field-issues-overlay"`, `:close-on-click-modal="false"`, `destroy-on-close`, and a responsive width. Render non-empty newline-delimited server lines as an ordered list without parsing field names, cell addresses, issue types, or source values. Include the guidance “请按单元格位置修正后重新上传，原文件未被修改”, copy the exact original message through the Clipboard API with explicit success/failure feedback, and provide a primary footer close button.

- [ ] **Step 2: Convert `ImportResultMessage.vue` to a summary/emitter**

Use a typed no-payload event:

```ts
const emit = defineEmits<{
  "show-issues": []
}>()
```

Keep exact stable-code branching and the first server line, but remove `ref`, `<el-dialog>`, and all local visibility state.

- [ ] **Step 3: Hoist current-batch dialog state into `ImportPage.vue`**

Maintain one selected issue object and one visibility ref. On `show-issues`, select `scope.row.fileName/message`; render a single `ImportFieldIssuesDialog` after the table/pagination region.

- [ ] **Step 4: Hoist history dialog state into `ImportHistoryPanel.vue`**

Use the same pattern for `ImportHistoryItem`, preserving server pagination and refresh behavior.

- [ ] **Step 5: Add scoped B-series styles**

Style only `.import-field-issues-overlay` and `.import-field-issues-dialog`; do not override global `.el-overlay`. Ensure the overlay is uniformly dark, the issue list has bounded viewport-relative height and its own scrolling, and the footer remains visible. Change `.import-result-message__first` from one-line ellipsis to a two-line clamp.

- [ ] **Step 6: Run focused tests and verify the dialog tests turn GREEN**

Run the same focused Vitest command. Expected: all tests pass.

## Task 3: Add correction-aware status semantics

- [ ] **Step 1: Extend presentation input without changing API types**

Use a readonly structural type:

```ts
type ImportPresentationItem = {
  readonly status: ImportStatus
  readonly code: string
}
```

Add `importItemStatusMeta(item)` so only `FAILED + IMPORT_FIELD_VALIDATION_FAILED` maps to `{ label: "需修正", type: "warning" }`; all other status labels remain unchanged.

- [ ] **Step 2: Make batch summary accept complete presentation items**

When every item is a field-validation failure, return kind `NEEDS_CORRECTION`, label `${items.length} 份待修正`, and warning type. Preserve existing pending, all-failed, partial-success, success, and empty branches.

- [ ] **Step 3: Update store and both tables**

Pass full items into `importBatchSummary`, handle `NEEDS_CORRECTION` exhaustively in the store with the message “批次检查完成，请修正工作簿中的字段问题后重新上传”, and call `importItemStatusMeta(scope.row)` for current/history tags.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run:

```bash
pnpm vitest run tests/unit/import-field-validation-details.test.ts tests/unit/import-list-pagination.test.ts
```

Expected: all tests pass, including ordinary-failure regression coverage.

## Task 4: Add real Electron layering coverage

**Files:**

- Modify: `playwright.config.ts`
- Modify: `tests/e2e/import-field-issues-dialog.spec.ts`
- Create: `tests/support/e2e-api-route-policy.ts`
- Create: `tests/unit/e2e-api-route-policy.test.ts`

- [ ] **Step 1: Create routed current-batch and import-history fixtures**

Before Electron starts, inspect the compiled renderer assets and require exactly one `/api/v1` base URL equal to the local E2E API. In the focused spec, intercept every-origin `/api/v1/**` traffic, reject any non-loopback origin before network I/O, and route login, personnel list, import upload, and import-history calls. Select four temporary ZIP-signature `.xlsx` files through the real main-process dialog/IPC boundary, then return four current-batch `IMPORT_FIELD_VALIDATION_FAILED` rows so the real table renders striped rows and its `fixed="right"` operation column. Keep history rows as a separate regression fixture.

- [ ] **Step 2: Assert modal hit-testing**

Navigate to “批量导入档案”, select and upload the temporary files, click the current batch's first “查看全部问题”, assert the dialog's active overlay is a body child, then check `document.elementFromPoint()` at coordinates over the topbar, sidebar, a later current-batch striped row, and the current table's right fixed column. Each point outside the dialog must resolve inside that same active overlay, not an underlying control.

- [ ] **Step 3: Assert modal interaction and responsive bounds**

Verify clicking the overlay does not close the dialog, the footer close button does, and at 1080×800 the dialog rectangle stays inside the viewport.

- [ ] **Step 4: Run the focused Electron E2E test**

Run:

```bash
pnpm exec vitest run tests/unit/e2e-api-route-policy.test.ts && \
  pnpm build && \
  pnpm exec playwright test tests/e2e/import-field-issues-dialog.spec.ts
```

Expected: one passed test in a normal macOS desktop session. The local build is mandatory: the test also catches all API origins and aborts if a stale production bundle attempts to call its configured server. If `CODEX_SANDBOX=seatbelt`, expect the project’s intentional pre-launch refusal instead of starting Electron.

## Task 5: Synchronize documentation and run final gates

- [ ] **Step 1: Update `CODE_GUIDE.md` and desktop `AGENTS.md`**

Document that field issues use one panel-level, body-teleported dialog; field-validation failures display as “需修正”; the original safe multiline message remains unchanged; and real Electron coverage protects modal isolation over fixed/striped table layers.

- [ ] **Step 2: Run formatter/lint, typecheck, unit suite, build, and focused E2E**

Run:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build:prod
```

Expected: every command exits 0.

- [ ] **Step 3: Inspect changed files and workspace artifacts**

Inspect the repository with `git status` and `git diff`, then confirm no generated screenshots, traces, credentials, or temporary test artifacts were added outside ignored output directories.
