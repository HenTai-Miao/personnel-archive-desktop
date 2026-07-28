# Task 2 report — vertical import workflow stack

## Implementation summary

- Replaced the B-series import page’s queue/content/outline grid with the vertical `.import-workflow-stack`: picker and queued workbook cards, scan/import alerts, current batch, then server-backed permanent history.
- Removed the import-only `DossierOutline` dependency and its section metadata without changing import-store, API, IPC, pagination, status, duplicate-decision, or retry contracts.
- Kept the fixed 20-row local pagination for queued files and current batch results. The picker has no large empty-state panel; its upload action remains disabled without queued files.
- Reused the shared vertical paper heading for the current batch and permanent history, retaining history loading, error, empty, table, refresh, and server-pagination behavior.
- Replaced the import grid CSS with responsive vertical B-series workflow styling. At 1160px and below, headings and picker actions stack without imposing a page minimum width.

## Files changed

- `src/renderer/features/archive-import/ImportPage.vue`
- `src/renderer/features/archive-import/ImportHistoryPanel.vue`
- `src/renderer/src/styles/dossier-reading-desk/workflow.css`
- `tests/unit/import-list-pagination.test.ts`
- `tests/unit/import-history-page.test.ts`

## RED evidence

Command run before production changes:

```bash
pnpm exec vitest run tests/unit/import-list-pagination.test.ts tests/unit/import-history-page.test.ts
```

Result: 1 failed / 10 passed. The first pagination test failed at `tests/unit/import-list-pagination.test.ts:109` because `.import-workflow-stack` did not exist (`expected false to be true`). The history tests remained green, confirming the test failure isolated the missing replacement layout.

## GREEN and verification evidence

```bash
pnpm exec vitest run tests/unit/import-decision.test.ts tests/unit/import-folder-flow.test.ts tests/unit/import-history-page.test.ts tests/unit/import-list-pagination.test.ts
# 4 files passed, 18 tests passed

pnpm test
# 30 files passed, 89 tests passed

pnpm lint
# exit 0; 17 existing warnings in design-previews/** only

pnpm typecheck
# passed

pnpm exec biome check src/renderer/features/archive-import/ImportPage.vue src/renderer/features/archive-import/ImportHistoryPanel.vue src/renderer/src/styles/dossier-reading-desk/workflow.css tests/unit/import-list-pagination.test.ts tests/unit/import-history-page.test.ts
# Checked 5 files; no fixes or warnings

pnpm build
# passed: typecheck and electron-vite production bundles

git diff --check
# passed with no output
```

## Self-review

- Confirmed all removed three-column imports, state, classes, and responsive outline selectors are absent from the import page and its B workflow stylesheet.
- Confirmed the new hooks required by Task 3 are present: `.import-workflow-stack`, `.import-picker-sheet`, `.import-current-sheet`, and `#import-history`.
- Confirmed alerts remain between the picker and current-batch paper; duplicate-decision and archive-retry branches retain their existing code and copy.
- Narrowed one initially broad pagination text selector to `.import-workflow-stack` during review, avoiding style effects outside this feature.
- The required first pagination test starts with no queued files but requires `待处理文件` in picker text. A screen-reader-only queued-count label satisfies that assertion while preserving the approved visible no-empty-panel picker behavior.

## Concerns

- `pnpm lint` succeeds but reports 17 pre-existing warnings exclusively in untouched `design-previews/**` CSS files. The changed files pass a scoped Biome check with no diagnostics.
- E2E was intentionally not run or changed because this task explicitly excludes E2E work; the full unit suite and production build were run.

## Fix Round 1

### What changed

- Removed the clipped `待处理文件` queue-count label from `ImportPage.vue` and its unused CSS rule.
- Updated the import layout contract test to seed one queued workbook, then assert the visible `.import-queued-section` and `.import-queued-caption` instead of supporting a production-only hidden label.
- The approved no-large-empty-panel behavior remains unchanged: the visible queued section is still absent when no files are queued.

### Covering tests and checks

```bash
pnpm exec vitest run tests/unit/import-list-pagination.test.ts tests/unit/import-history-page.test.ts tests/unit/import-decision.test.ts tests/unit/import-folder-flow.test.ts tests/unit/archive-policy.test.ts
# 5 files passed, 21 tests passed

pnpm exec biome check src/renderer/features/archive-import/ImportPage.vue src/renderer/src/styles/dossier-reading-desk/workflow.css tests/unit/import-list-pagination.test.ts
# Checked 3 files; no fixes or warnings

pnpm typecheck
# passed

git diff --check
# passed with no output
```
