# CLIENT KNOWLEDGE BASE

Inherits all product, data, security, and API rules from `../AGENTS.md`. This directory owns the Windows desktop client; its technical project and package name is `personnel-archive-desktop`.

This checkout is the isolated B-series redesign copy. It keeps the fixed product name and all client security and business contracts, while its authenticated shell, login, and business pages are being migrated to the `B 卷宗检阅桌` visual system. The sibling `../personnel-archive-desktop` remains the current packaged-client source until this copy is explicitly promoted.

## CURRENT CLIENT STATUS

- Implemented routes are login, active archive list with selected batch ZIP export, family-member search, optional-field manual/automatic-folder batch import with the same duplicate-decision flow and persistent import-history panel, folder settings, and complete archive detail/single-export-open.
- The folder-settings route and IPC behavior remain implemented, but its business-directory navigation entry is temporarily hidden; do not remove the stored settings or automatic scan/archive flow.
- All authenticated routes use the `03 卷宗联动台` cobalt/white archive-workbench theme over Element Plus and Avue: a 60px translucent light system bar, 200px business directory, restrained rounded controls, light data grids, shared panels/status/dialogs, and sticky detail navigation that compensates for workspace padding to sit flush at the scroll edge. The login route keeps its existing Windows management-console structure and visual tokens in an isolated scope. Avue renders the existing personnel directory columns/actions while feature stores remain authoritative for filtering, pagination, selection, and exports.
- The personnel directory starts with the list at full width. Clicking a directory row loads the details and authenticated, audited photo while opening a 320px right drawer; the action column contains view/export for every role and a red delete action only for `ADMIN`/`ARCHIVE_EDITOR`. The drawer separator supports pointer and keyboard resizing from a 280px minimum up to the current workbench width, allowing the list to contract to zero; container shrink clamps an oversized drawer, and closing restores the full-width list. The preview keeps identity-card and phone values masked and never calls the sensitive-value reveal endpoint. At 1280px and below the preview moves below the list and the separator is hidden so the 1080px minimum window retains usable table actions; batch selection remains independent from preview selection.
- Every business list uses the shared fixed pagination policy of 20 visible rows: personnel, family-member, and import-history queries request server pages, while upload queues and current import results are sliced locally without discarding entries.
- Archive detail displays every imported section in workbook order, including personal/employment fields, education, ordered history/reward rows, full family-member fields, declaration data, snapshot metadata, and the authenticated stored photo. Identity-card and phone values default to front-four/back-three masks; a user can explicitly reveal or hide one complete value, and revealed values plus photo Object URLs are cleared on replacement/unmount.
- Batch export keeps identifiers as strings, downloads one server-generated ZIP, and exposes only a native save-dialog capability; the renderer never supplies an arbitrary target path.
- Electron Playwright tests fail before process creation when they detect Codex's macOS Seatbelt sandbox, which otherwise aborts in AppKit and opens a misleading generic Electron crash dialog; run those tests from a normal terminal or Windows CI.
- The client persists pending-upload/completed-archive folder settings under Electron `userData`, scans while an authorized session is active, and queues direct valid `.xlsx` children. Only automatically scanned files are moved after `IMPORTED`/`OVERWRITTEN`; manual, pending, skipped, failed, changed, or move-failed sources stay in place.
- Automatic moves create a missing archive directory, use exclusive-copy plus source deletion for cross-volume safety, suffix same-name targets instead of overwriting, and expose a retryable failure state.
- User/role administration and audit-log screens are not implemented.
- Update this section in the same change whenever a route or supported user flow is added, removed, or completed.

## STACK

- Electron with a security-patched stable release; Node.js LTS for tooling.
- Vue 3, TypeScript strict mode, Vite/electron-vite.
- Element Plus, `@smallwei/avue`, Pinia, Vue Router, `ky`, Zod, Biome, and electron-builder.
- Use `pnpm` and commit the lockfile. Pin tool/runtime versions; never depend on `latest` tags.

## TARGET STRUCTURE

Use `src/main`, `src/preload`, and `src/renderer`; reserve `src/shared` for contracts safe in every process. Under the renderer, use `app`, `features/{auth,archive-import,archive-view,family-search,folder-settings,person-list}`, and `shared/{api,components,types}`.

Organize renderer code by business feature. Vue pages compose features; they do not own HTTP, import-state, or file-system logic.

## PROCESS BOUNDARIES

- `main` owns native dialogs, folder-setting persistence, scoped directory scanning, safe non-overwriting moves, user-confirmed ZIP saves, temporary-file writes/cleanup, and opening Excel/WPS.
- `preload` exposes named, narrow, typed methods through `contextBridge`.
- `renderer` is a pure Vue application and must not import `electron`, `fs`, `path`, `child_process`, or other Node APIs.
- Never expose a generic `invoke(channel, payload)` bridge. Validate sender, payload, extension, and target path in the main process.

Required Electron settings are `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`, and `webSecurity: true`.

Production loads packaged local UI only. Block arbitrary navigation, new windows, and unapproved external URLs.

## USER FLOWS

- Login and session-expired handling.
- Single/batch `.xlsx` selection, upload/precheck, duplicate-decision review, progress, and per-file result table.
- Server-backed import-history browsing with processing time, batch, workbook name, operator, final/current status, and result message; refreshing or restarting the client must not erase it.
- Pending/archive folder selection, authenticated-session background scanning into the upload queue, and automatic archive status/retry feedback.
- Family-member fuzzy search with all matching personnel/member rows preserved.
- Archive action that downloads the server-generated workbook and opens it with the associated desktop application.
- Archive-list selection that requests a bounded server-generated ZIP and saves it through the operating-system dialog; canceling writes nothing.
- Archive soft deletion for `ADMIN`/`ARCHIVE_EDITOR`: open a confirmation dialog with required reason defaulting to “误导入”, limit it to 10,000 characters, then close preview/clear selection and refresh the current page; if the final row empties a later page, return to the preceding page.
- User/role and audit screens only for authorized roles.

The client may validate extension and size for immediate feedback, but template, field, duplicate, and permission decisions always come from the backend. It must accept blank imported employee/name/identity values in response schemas and display safe placeholders rather than rejecting the response. The client must not compare names or identity cards to decide duplicates.

- Both manually selected and automatically scanned files use the same upload/precheck API. For `DUPLICATE_REQUIRES_DECISION`, show the file, name, masked identity-card last four characters, existing/new employee number, and necessary update time only.
- Default to `SKIP`. `OVERWRITE` requires an explicit confirmation explaining that the old snapshot becomes deleted and this workbook becomes the new active snapshot; cancel, close, network failure, or session expiry never implies overwrite.
- Submit only the import-item identifier and `OVERWRITE`/`SKIP` decision. The client never submits or manipulates `is_deleted`; a stale-decision response must refresh the duplicate review.

## API AND SENSITIVE DATA

- Inject the API base URL through environment/configuration; do not scatter hard-coded URLs.
- Centralize `ky` configuration, authentication, error-code mapping, cancellation, and download handling.
- Components never call HTTP clients directly. Keep calls in each feature's API layer and parse API responses with Zod.
- Keep access credentials in memory. Protect any persisted refresh credential with Electron `safeStorage`; never use `localStorage`.
- Do not persist archive records, query results, photos, or source/generated Excel in IndexedDB or ordinary application storage.
- Import history is queried from the authenticated service and kept only in page component memory; the client does not create a second local record store.
- Never log full API payloads or sensitive fields. UI masking is required where a full value is unnecessary.
- Base detail responses must never contain full identity-card or phone values. Fetch one full value only after the matching “显示” action, keep it in component memory, and clear it on “隐藏”, record replacement, route change, or unmount; the service remains authoritative for authorization and audit.
- Revoke temporary image Object URLs and clean temporary workbooks on startup/retention expiry.
- Client route/element permissions improve UX only; do not treat them as authorization.
- Deletion uses the feature API layer and stable `NOT_FOUND` handling. A stale/missing archive closes the dialog and refreshes the directory; other failures remain in the dialog for retry, and deletion reasons are never logged or persisted by the client.

## UI CONTRACT

- Chinese is the primary interface language.
- Every data screen handles loading, empty, network failure, validation failure, no-permission, and expired-session states.
- Every business-data list keeps the pagination footer visible when it contains data, states “每页 20 条”, and resets/clamps local page state when its backing collection shrinks.
- Archive deletion requires an explicit confirmation; blank/whitespace reasons disable submission, the suggested “误导入” remains editable, and successful/stale deletion refreshes server state instead of removing a row optimistically.
- Import history requests exactly 20 records per server page, sorts according to the service response, and can be refreshed without disturbing the current upload queue.
- Batch import distinguishes pending decision, newly imported, overwritten, skipped, failed, and partially successful outcomes.
- Dates display as `yyyy-MM-dd`; age shown in results is transient and never written back as source data.
- The detail page follows the workbook's information hierarchy and provides a sticky in-page index; empty sections remain visible as explicit “未填写” states instead of disappearing.
- Identity-card and phone rows place a compact “显示/隐藏” control directly after the value; blank masked values have no reveal action, loading is field-specific, and a failed reveal leaves the masked value visible.
- Map behavior from stable backend error codes, never by parsing error-message text.

## BRANDING AND PACKAGING

- The canonical desktop icon is `build/icon.png` at 1024 x 1024. Keep the derived Windows
  `build/icon.ico` and macOS `build/icon.icns` synchronized whenever the artwork changes.
- `package.json` must bind the platform icons for Windows, macOS, and Linux and copy `icon.png`
  through `extraResources` for runtime window use; never ship the default Electron icon.
- The Electron main process must use the project icon for `BrowserWindow` and the macOS Dock in
  development, and resolve the packaged copy from `process.resourcesPath` after installation.
- Preserve the fixed product name `人员档案助手`, executable `PersonnelArchive.exe`, and installer
  artifact `PersonnelArchive-Setup.exe` when changing icon or packaging configuration.

## TEST AND BUILD BASELINE

Establish `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and `pnpm test:e2e` scripts.

`pnpm test:e2e` must never spawn Electron from Codex's macOS Seatbelt sandbox. Keep the fail-fast launch policy and its unit regression test intact; this host restriction does not justify weakening Electron's production renderer sandbox.

For macOS manual testing, build/package first and use the root `../启动本地测试.command` from a normal desktop session. The helper waits for Docker, MySQL, the backend, and a successful administrator login before opening `release/mac-arm64/PersonnelArchive.app`; it is not part of the Windows production package.

Use Vitest/Vue Test Utils for feature states and real temporary directories for folder settings, scan filtering, archive creation, collision suffixing, source retention, manual/automatic source policy, batch selection, ZIP contract, and save-result feedback. Playwright's Electron coverage includes login and the real IPC scan/archive path; also cover default skip, explicit overwrite, mixed batch results, stale decisions, multi-result search, single download/open, batch download/save, and session expiry. Windows installers must be validated on Windows CI. Product name is `人员档案助手`; installed executable is `PersonnelArchive.exe`.

## CODE DOCUMENTATION

- Keep the frontend module entries and flows in `../CODE_GUIDE.md` synchronized with source changes.
- Add or update comments where an Electron process boundary, IPC trust check, credential lifetime, file-system safety rule, runtime schema, or intentionally limited retry policy would otherwise be easy to break.
- Prefer a concise module responsibility comment plus reason-focused comments over comments that merely translate TypeScript or template syntax into prose.
- Configuration files that cannot contain comments are explained in `../CODE_GUIDE.md`; do not convert JSON solely to make comments possible.
- Before completion, reconcile `CURRENT CLIENT STATUS` with the actual router, IPC bridge, feature directories, and tests; planned behavior must remain visibly marked as unimplemented.

## CLIENT ANTI-PATTERNS

- Direct database access or duplicated backend business rules.
- Node APIs in renderer code or broad IPC exposure.
- Long-term local caching of personnel data.
- Constructing the archive workbook in the client.
- Default, automatic, optimistic, or unconfirmed overwrite behavior.
- Treating front-end validation or hidden buttons as security controls.
