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
