# Baseline Failures — RED Phase Record

Observed agent failures from real bug-fixing sessions that drove the current skill rules.
Each entry documents: what the agent did, what rationalization it used, and which rule was added.

---

## Session: Custom-space visibility bug (Issue: general, Date: 2026-04-15)

### Failure 1 — API shortcut masked the real defect

**What the agent did:** Reproduced using a mutation API endpoint instead of navigating through the UI as the ticket described.

**Rationalization used:** The API endpoint was faster to call and appeared to expose the same behaviour described in the ticket.

**Why it was wrong:** The mutation API was a different code path from the UI. The real bug was in the list API (no lazy initialization), which the API shortcut never hit. The agent fixed a conflict error on mutation — the wrong symptom entirely.

**Rules added:**
- `bug-reproduce` Phase 3: "Reproduce through the browser — not via API calls. The UI and API hit different code paths; an API shortcut can mask the real defect entirely."
- `bug-reproduce` Red Flags: "I called the API and confirmed the bug — that's reproduction" → Reality: API calls are not reproduction.

---

### Failure 2 — Data path not traced before fix

**What the agent did:** Identified the failing component from console errors, then wrote a fix without tracing the full data path from UI → API → data source.

**Rationalization used:** The console error pointed directly at a component; the fix seemed obvious from there.

**Why it was wrong:** The component was correct. The root cause was upstream — the list API had no initialization step, so data was only populated at startup. Fixing the component left the underlying data gap untouched.

**Rules added:**
- `bug-reproduce` Phase 3: "For 'X is not visible' bugs, trace the data path: identify the API call via browser_network_requests, read the route handler, find the lifecycle gap."
- `bug-reproduce` Red Flags: "I've read the source code thoroughly — I know what's broken" → Reality: source reading is not reproduction.

---

### Failure 3 — Boot-time-only migration

**What the agent did:** Added an initialization migration that ran at startup to seed missing data.

**Rationalization used:** Running initialization at startup covers all cases.

**Why it was wrong:** Resources created after the server started were never initialized — the migration only ran once at boot. The bug reproduced for any resource created post-boot.

**Rules added:**
- `bug-fix` Phase 5 step 5: "Lifecycle edge case — if the fix involves startup or boot-time seeding, create a new space/resource *after* services are running and verify it works."
- `classification-guide.md` `missing_lazy_initialization` fix strategy: "Add ensure-on-first-read (lazy init) in the list/get route handler so data is seeded when first accessed, not only at boot."

---

### Failure 4 — Over-engineered conflict handling

**What the agent did:** Built a catch-conflict → list-by-name → retry-with-generated-ID mechanism for saved object ID construction.

**Rationalization used:** Conflict handling was needed to make the ID generation robust.

**Why it was wrong:** The established Kibana pattern for `multiple-isolated` saved objects is `${baseId}-${namespace}` — unique by construction. No conflict detection is needed. The agent invented a new mechanism instead of searching for the existing convention. Related index patterns were also hardcoded with `'default'` namespace, pointing to wrong data in custom spaces.

**Rules added:**
- `bug-fix` SELF-CHECK #3 question 1: "How does the codebase already solve this kind of problem? Adopt the established convention; do not invent a new mechanism."
- `classification-guide.md` Pre-Fix Checklist item 1: "Search for existing patterns — `rg` the codebase for how similar problems are already solved."
- `classification-guide.md` Pre-Fix Checklist item 2: "Audit hardcoded namespaces — `rg "'default'"` in the affected module."

---

### Failure 5 — Cross-plugin direct import

**What the agent did:** Added an initialization function as a direct import into a route handler owned by a different plugin. Also placed the logic in a generic enable route (covers both install and re-enable) when it should only run during first-time install.

**Rationalization used:** The function was already available; importing it directly was the simplest path.

**Why it was wrong:** Direct imports across plugin boundaries violate Kibana's plugin architecture. The team replaced it with a dedicated endpoint called from the owning plugin's install flow. The generic route placement also meant the logic fired on re-enable, not just first-time install.

**Rules added:**
- `bug-fix` SELF-CHECK #3 question 3: "Do the caller and callee belong to the same plugin? If different plugins, use routes or contracts instead of direct function imports."
- `bug-fix` SELF-CHECK #3 question 4: "Which lifecycle phase does this logic belong in? Don't default to the most generic entry point."
- `classification-guide.md` Pre-Fix Checklist items 3–4.

---

## Session: SharedLists backspace bug (Issue: general, Date: 2026-05-22)

### Failure 6 — JSDOM + imperative event listener silently ignored

**What the agent did:** Implemented the fix using `addEventListener('input', ...)` inside a `useEffect`. The listener worked in the browser but the test passed silently in JSDOM — `fireEvent.input` was dispatching events that the listener never received.

**Rationalization used:** The listener worked correctly in the live browser session; JSDOM behaviour was assumed to match.

**Why it was wrong:** `fireEvent.input` dispatches a native DOM event that bypasses React's synthetic event system. Imperative listeners registered via `addEventListener` inside `useEffect` are not invoked by native DOM events in JSDOM. The test appeared to pass, but was not actually exercising the code path.

**Rules added:**
- `classification-guide.md` Testing Footguns: "JSDOM + imperative event listeners — use React `onInput`/`onChange` props instead of `addEventListener` for any event that must be testable with `fireEvent`."
- `bug-fix` Phase 4 Step 2: state machine and synthetic event guidance added.

---

### Failure 7 — Fix reported complete without re-running the test

**What the agent did:** Wrote the failing test, implemented the fix, and reported the task complete — without re-running the test after the implementation to confirm it was green.

**Rationalization used:** The fix looked correct from code inspection; re-running the test felt like a formality.

**Why it was wrong:** A test written before the fix and not re-run could still be red. The fix may have been incomplete or incorrect, and the agent had no evidence either way. The session ended with the test status genuinely unknown.

**Rules added:**
- `bug-fix` Phase 4 Step 3 hard gate: "Do not move to Phase 5, write the summary, or claim the fix is complete until you have seen the test exit with code 0."
- `bug-fix` Red Flags: "I wrote the test and the fix — I'll confirm it passes in Phase 5."

---

### Failure 8 — Component state machine not mapped before writing test

**What the agent did:** Started writing a test for a component bug without first reading the source to map the component's internal state transitions (`viewerStatus: SEARCHING → LOADING → null`). Multiple test iterations failed because the test reached the wrong intermediate state.

**Rationalization used:** The bug description made the expected behaviour clear; internal state details would emerge during testing.

**Why it was wrong:** Internal state transitions that are not part of the public API can only be discovered by reading the source. Each failed test iteration was caused by a wrong assumption about intermediate state, which could have been eliminated by reading the component first.

**Rules added:**
- `classification-guide.md` Testing Footguns: "Component state machine — map every state value and transition before writing a test that depends on them."
- `bug-fix` Phase 4 Step 2: "For component bugs — before writing any test, map the component's state machine."

---

### Failure 10 — EuiToolTip existence check written instead of behavior assertion

**What the agent did:** Fixed a bug that involved removing an `EuiToolTip` wrapper from a button. Wrote `expect(wrapper.find(EuiToolTip)).toHaveLength(0)` as the regression test.

**Rationalization used:** The fix removed an element; the natural test is to assert the element is gone.

**Why it was wrong:** Existence checks for removed elements are fragile — any future tooltip anywhere in the component tree will break the test — and misrepresentative — they assert presence, not the behavior the bug was about. The correct assertion is behavioral: either (a) the action that was incorrectly blocked now succeeds (e.g., a click fires, a mutation runs), or (b) a user-visible outcome changed. If neither can be asserted, skip the unit test and document the reason in the PR.

**Rules added:**
- `bug-fix` Phase 4 Step 2 Red Flags: "`My test is expect(component.find(X)).toHaveLength(0) — that covers the removal`"
- `bug-fix` Phase 4 Step 2 Removal fixes: ask whether behavior can be asserted instead; skip unit test if not and note in PR.

---

## Session: Exception list mutation bug (PR: #269186, Date: 2026-05-19)

### Failure 9 — Initialization function called in onSuccess instead of using mutation return value

**What the agent did:** Fixed a `stale_data_after_mutation` bug by calling `initializeList` inside the mutation's `onSuccess` callback. The reviewer flagged it: `initializeList` does more than refetch — it has setup side effects. The correct fix was to make `updateList` return the updated list and call `setList(updated)` directly.

**Rationalization used:** `initializeList` was the obvious function to call to refresh the list state after a mutation; it appeared to be a generic "refresh" utility.

**Why it was wrong:** The agent used a function without reading its implementation. `initializeList` triggers side effects beyond a simple data refresh. The mutation's return value was the correct data source — no secondary call was needed at all.

**Rules added:**
- `classification-guide.md` Fix Strategies `stale_data_after_mutation`: preferred hierarchy — mutation return value → `setState(result)` first; `invalidateQueries` only if mutation returns nothing; never call initialization functions in `onSuccess`.
- `fix-workflow.md` SELF-CHECK #3 question 7: "Does the mutation return the updated object? Read every function's implementation before using it in `onSuccess`."
