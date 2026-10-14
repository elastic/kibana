# Bug Fixer — Knowledge Base

Accumulated learnings from bug-fixing sessions. Read this file at the start of every session. Entries are append-only.

Generic rules extracted from these incidents live in `SKILL.md` (Phase 3 self-checks, Phase 4 self-checks) and `references/classification-guide.md` (Pre-Fix Checklist). The entries below preserve the incident-specific context.

---

### Custom-space visibility bug — misdiagnosis via API shortcut
- **Date**: 2026-04-15
- **Incident**: The agent reproduced using a mutation API endpoint instead of navigating through the UI as the ticket described. The mutation API was a different code path — the real bug was that the list API had no lazy initialization and returned empty for spaces created after boot. The agent fixed the wrong symptom (conflict error on mutation) and missed the actual defect.
- **Generic rule**: → SKILL.md Phase 3, SELF-CHECK #1 and #2

### Custom-space visibility bug — missed data path trace
- **Date**: 2026-04-15
- **Incident**: The UI called the list API, which had no initialization step — data was only populated at startup or via a separate enable flow, neither of which covers resources created post-boot. The agent didn't trace this path before writing the fix.
- **Generic rule**: → SKILL.md Phase 3, "Trace the data path"

### Custom-space visibility bug — boot-time-only migration
- **Date**: 2026-04-15
- **Incident**: The fix added an initialization migration that ran at startup, but resources created after the server started were never initialized.
- **Generic rule**: → SKILL.md Phase 5 step 5 (lifecycle edge case check), classification-guide.md `missing_lazy_initialization`

### Custom-space visibility bug — over-engineered conflict handling
- **Date**: 2026-04-16
- **Incident**: The agent built a catch-conflict → list-by-name → retry-with-generated-ID mechanism. The established Kibana pattern for `multiple-isolated` saved objects is `${baseId}-${namespace}` — unique by construction, no conflict detection needed. Related index patterns were also hardcoded with the `'default'` namespace, pointing to wrong data in custom spaces.
- **Generic rule**: → SKILL.md Phase 4, SELF-CHECK #3 items 1–2; classification-guide.md Pre-Fix Checklist items 1–2

### Custom-space visibility bug — cross-plugin direct import
- **Date**: 2026-04-16
- **Incident**: The agent added an initialization function as a direct import into a route handler owned by a different plugin. The team replaced it with a dedicated endpoint called from the owning plugin's install flow. The agent also placed the logic in a generic enable route (covers both install and re-enable) when it should only run during first-time install.
- **Generic rule**: → SKILL.md Phase 4, SELF-CHECK #3 items 3–4; classification-guide.md Pre-Fix Checklist items 3–4

### SharedLists backspace bug — JSDOM + imperative event listener silently ignored
- **Date**: 2026-05-22
- **Incident**: First implementation used `addEventListener('input', ...)` inside a `useEffect`. It worked in the browser but the test was silently ignored in JSDOM — `fireEvent.input` dispatches a native DOM event that bypasses React's synthetic event system, so imperative listeners don't fire. Fix: replace `addEventListener` with a React `onInput` prop on a wrapper `<div>`. The browser and JSDOM behave identically with the React prop form.
- **Generic rule**: → classification-guide.md Testing Footguns (JSDOM + imperative event listeners)

### SharedLists backspace bug — test not re-run after fix
- **Date**: 2026-05-22
- **Incident**: The agent wrote the test and implemented the fix, but the session ended before the test was re-run to confirm it was green. Fix was reported as complete even though the test status was unknown.
- **Generic rule**: → bug-fix/SKILL.md Phase 4 Step 3 hard gate ("do not proceed to Phase 5 until test exits 0")

### SharedLists backspace bug — component state machine undocumented
- **Date**: 2026-05-22
- **Incident**: The `viewerStatus` state machine in SharedLists (`SEARCHING → LOADING → null`) was not documented. Writing a test that depended on these transitions required multiple trial-and-error rounds before the right intermediate state was reached.
- **Generic rule**: → classification-guide.md Testing Footguns (component state machine); bug-fix/SKILL.md Phase 4 Step 2 (map state machine before writing test)

### Exception list mutation — initializeList misuse in onSuccess (PR #269186)
- **Date**: 2026-05-19
- **Incident**: Fixing a `stale_data_after_mutation` bug, the agent called `initializeList` inside the mutation's `onSuccess` callback. The reviewer (denar50) pointed out that `initializeList` does more than refetch — it has setup side effects. The correct fix was to make `updateList` (in `public/exceptions/api/list_api.ts`) return the updated list object, then call `setList(updated)` directly in `onSuccess`. The agent chose a function that seemed to refresh state without reading its implementation.
- **Generic rule**: → classification-guide.md Fix Strategies `stale_data_after_mutation`; fix-workflow.md SELF-CHECK #3 question 7
