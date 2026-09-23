# Task 8 live validation report: route-load optimization and final validation

**Scope:** the roadmap's Task 8 checklist item "Run the seeded regression suite in
legacy, injected, and shadow modes: silent 500, delayed missing element,
intentional query variants, duplicate click, CCS badge, known noise,
permission gating, cancellation, refresh, and cleanup collision" plus
"Compare recall, false positives, duplicate rates, completed checklist steps,
evidence completeness, and owned-resource cleanup against the legacy
baseline."

**Method:** a real Chromium instance driven via the Playwright MCP
(`browser_evaluate`/`browser_run_code_unsafe`), a real Scout-managed Kibana
instance (stateful-classic) for the Phase 0/1 route-split smoke test, and a
purpose-built local harness (`scripts/manual-tools/seeded-live-harness.html`
+ `serve-seeded-harness.py`) that reproduces each scenario's real browser-level
DOM/console/network signature via genuine `fetch()`/`AbortController`/`history`
calls — not synthetic pre-built event objects. This is what makes the
validation "live": every fixture referenced below (`live-drain-scenario*.json`)
is a verbatim capture of real bridge output from that harness, not hand-written
JSON.

## Per-scenario results

| # | Scenario | Legacy (Detectors A/B/C) | Shadow collector | Notes |
|---|---|---|---|---|
| 1 | Silent 500 | ✅ Detector B: Level 1 `server_error` (browser auto-logs "500") | 🔧 **Bug found & fixed**, then ✅ correctly defers (0 findings) | See "Bug found and fixed" below |
| 2 | Delayed missing element | ✅ Detector A: DOM anomaly (after harness markup fix to match real EUI spinner selectors) | N/A — out of scope by design (needs externally-computed `spinnerVisibleForMs`; already unit-tested with hand fixtures, not part of the live browser bridge) | |
| 3 | Intentional query variants | ❌ **False positive**: Detector C groups by path only, wrongly flags 3 distinct `?q=`/`?page=` combinations as duplicates | ✅ 0 findings — full-URL grouping correctly treats them as distinct | Real fixture: `live-drain-scenario3-query-variants.json` |
| 4 | Duplicate click | ✅ Detector C: correctly flags the true duplicate | ✅ Level 2 `duplicate_api_call` | Real fixture: `live-drain-scenario4-duplicate-click.json` |
| 5 | CCS badge | ✅ Detector A (after harness markup fix to match the real icon-only `searchResponseWarningsBadgeToogleButton`) | N/A — out of scope (DOM-only, Detector A's job exclusively) | |
| 6 | Known noise + genuine failure | ✅ Detector C suppresses the noise; Detector B flags the one genuine 500 as Level 1 | ⚠️ **Mixed**: the genuine 500 is correctly not double-reported (0 Level 1). But the 5 sequential polls (none of them overlapping in flight) are flagged as a Level 2 `duplicate_api_call` (`count: 5`) — a **new false positive**, corrected into this report after an independent review ran the fixture and caught the contradiction (an earlier draft of this report claimed this was "not exercised live"; it was, and it produced this result). See "Known limitations" below. | Real fixture: `live-drain-scenario6-known-noise-genuine-failure.json` — now asserted in `action-scoped-collector.test.mjs` |
| 7 | Permission gating (403) | ✅ Detector B: Level 3 `console_error` (correctly *not* Level 1 — `\b50[0-9]\b` doesn't match 403) | ✅ 0 findings (status < 500 is out of scope by design) | Real fixture: `live-drain-scenario7-permission-gating.json` |
| 8 | Cancellation | ✅ correctly silent (no console/DOM signal) | ✅ 0 findings | Real fixture: `live-drain-scenario8-cancellation.json` |
| 9 | Refresh mid-request | ⚠️ only visible as a raw `net::ERR_ABORTED` network-log line; no detector produces a structured finding | ✅ **Value-add**: Level 3 `request_abandoned_by_navigation`, correctly excluding the reload's own document request from being marked abandoned by itself | Real fixture: `live-drain-scenario9-refresh-mid-request.json` — this exercises the bridge's most complex logic (per-frame navigation-abandonment tracking) and it held up correctly against a real reload |
| 10 | Cleanup collision | N/A — not a browser scenario | N/A — not a browser scenario | Validated directly against `session_resources.py`/`cleanup-session-resources.py`; see below |

## Bug found and fixed: shadow collector double-reported silent 500s

**Symptom.** Feeding a real captured `silent-500` event (real `fetch()` 500,
zero app-level error handling — genuinely the most common form of "silent"
failure) through `action-scoped-collector.mjs`'s `reduceAction` produced a
Level 1 `silent_server_error` finding whose own text claimed *"no
corresponding console error — Detector B alone would miss this"* — but
Detector B **does** catch it: the browser auto-generates `"Failed to load
resource: the server responded with a status of 500 (Internal Server
Error)"`, and `classify-console.js`'s `\b50[0-9]\b` rule has no path
requirement, so it always flags this. The reducer's own
`alreadySurfaced` guard, meant to prevent exactly this double-count, required
the console text to contain *both* the status code *and* the request's path —
but the browser's own auto-generated message never includes a path at all.
Only a hand-authored `"500 @ /api/foo"`-style app log (the shape the
pre-existing `action-500-already-surfaced` fixture used) could ever satisfy
it. This gap existed only because no fixture in the suite reflected the real
browser-native message shape before this live validation pass.

**Fix.** Added a module-level `BROWSER_NATIVE_LOAD_FAILURE` regex and
`countBrowserNativeLoadFailuresByStatus(consoleText)` in
`action-scoped-collector.mjs`, matched per-status so a browser-native message
for one status can't wrongly suppress a genuinely-unsurfaced finding for a
different status. Added a real fixture
(`action-500-already-surfaced-browser-native.json`) and a regression test
documenting the live scenario that found it. Re-ran the real captured event
through the fixed reducer: `level1` is now correctly empty.

**Follow-up fix (found in independent review, not live-tested).** The
per-status guard above was still a bare presence test against the whole
action's `consoleText` — one native message for a status covered *every*
request of that status in the action, not just the one that produced it. Two
distinct 500s to different paths with only one native console message would
both have been wrongly suppressed. Fixed by making
`countBrowserNativeLoadFailuresByStatus` return a per-status *count*, and
having the silent-server-error pass (now a single action-wide loop over all
network events sorted by time, not nested per-signature) consume one count
per qualifying event instead of testing presence. Three new hand-written
regression tests cover: two 500s + one message (only one is covered), two
500s + two messages (both covered), and cross-status isolation (a 500
message never covers a 503). Not exercised against a real multi-500 browser
capture — the seeded harness only produces one native-500-shaped event per
run — so this fix is unit-tested but not live-validated the way the rest of
this report is.

**Broader implication for the roadmap's promotion criterion** ("Shadow
collector mismatches are measurable, persisted, and reviewed before
promotion"): because Chromium auto-logs every failed HTTP load to console
regardless of app-level handling, `silent_server_error`'s value-add over
Detector B for plain 5xx responses is narrower in real Chromium testing than
its docstring implies — it mainly helps for `abandonedByNavigation` cases
(which it correctly excludes) and any future browser/resourceType combination
that doesn't auto-log. This is worth calling out explicitly in the promotion
review, not just the diff mechanism itself. This pattern has only been
verified against Chromium; Firefox's equivalent browser-native message
wording has not been captured and must not be assumed to match.

## Known limitations found by independent review (corrected into this report)

An independent review of this pass ran `live-drain-scenario6-known-noise-genuine-failure.json`
directly through `reduceAction` and got `level2: [{"type":"duplicate_api_call","count":5}]` —
contradicting an earlier draft of this report, which described scenario 6's noise-suppression
path as "not exercised live" and the metrics table's false-positive row as "0 (after the
silent-500 fix)". Both statements were wrong: the scenario *was* exercised, and it produced this
undocumented finding. Corrected here rather than left silent, per the review's finding.

**Root cause.** `DUPLICATE_WINDOW_MS` is a time-span threshold (all events within 500ms of the
group's first event), not an in-flight-overlap check. The fixture's 5 polls never have more than
one request in flight at a time — each starts only once the previous one has already responded
(1826→1891, then 1891→1943, then 1943→2024, …) — while the genuine `duplicate-click` fixture
(scenario 4) has its two requests overlapping almost entirely (148→283 and 149→293, both started
within 1ms of each other). A check for "are two requests of the same signature ever in-flight at
the same time" would distinguish a real double-submit from rapid sequential polling directly,
without depending on a hardcoded path allowlist (`POLLING`) the way suppression does today. This
is a real design improvement, not just a bug fix, and is left as a follow-up rather than bundled
into this validation pass — the fixture and this section exist so it isn't lost.

## Cleanup collision — live validation against `session_resources.py`

`kibana_space` resource ids are always namespaced by
`namespaced_flow_space_id` (the session id is baked into the id itself), so
two different sessions can never collide on the same space id through
`create-flow-spaces.py`. A real collision is only possible for kinds whose
ids are caller-chosen and can be identical across sessions — e.g. a shared
noise index two parallel sessions might both want.

Before this pass, that scenario was only ever tested as an in-memory
`cleanup_candidates()` call with a hand-inserted `"wrong-session"` marker
(`test_cleanup_candidates_only_include_owned_resources_with_matching_marker`)
— never through two real, independent on-disk session directories and the
actual `cleanup-session-resources.py` CLI end-to-end. This pass ran that
missing case live:

1. Two real session directories, `session-a` (`sessionaaaa`) and `session-b`
   (`sessionbbbb`), each register the *same* `es_index` resource id
   (`exploratory-testing-noise-index-1`) — session A as `owned=True`
   (simulating the real HTTP 200 it got creating it), session B as
   `owned=False` (simulating the real HTTP 409 it got finding it already
   existed).
2. `cleanup-session-resources.py --dry-run` for session B: `No owned session
   resources to clean up.` — correctly excluded.
3. `cleanup-session-resources.py --dry-run` for session A: `Would clean
   es_index 'exploratory-testing-noise-index-1'` — correctly included.
4. Real (non-dry-run) cleanup for session B, with `curl` logging every
   invocation: **no log file was ever created** — session B's cleanup never
   even attempts to touch the resource it doesn't own.
5. Real cleanup for session A: `Resource '...': deleted`, curl was invoked
   exactly once with `-X DELETE`.
6. Session B's on-disk config after both cleanups: untouched, still
   `"state": "reused"`, no `cleanup_status` — proof A's cleanup run had zero
   effect on B's resource record.

**Result: PASS, no bug found.** Added
`test_cross_session_cleanup_collision_on_a_shared_non_namespaced_resource` to
`test_session_resources.py` so this exact live-validated path has permanent
regression coverage — it asserts on curl's own invocation log, not just exit
codes, so it would catch a bug that produced the right exit code by accident
while still wrongly enqueuing a delete for a foreign session's resource. (See
"Final Python/JS suite counts" at the end of this report for the current
pass/fail counts — this section's own count went stale after later follow-up
passes added more tests and is deliberately not repeated here.)

## Metrics comparison vs. the legacy baseline

| Metric | Legacy | Shadow |
|---|---|---|
| Recall (real signals in scope, live-tested) | 5/5 caught (silent-500, delayed-missing-element, duplicate-click, CCS badge, known-noise genuine failure) | 2/2 caught within its network/console scope (duplicate-click, known-noise genuine failure — deferring correctly on silent-500 since Detector B already reports it), **plus 1 scenario (refresh-mid-request) legacy has no equivalent finding for at all** |
| False positives (live-tested) | 1 confirmed: query-variants wrongly grouped as a duplicate | 1 confirmed: known-noise's 5 sequential polls wrongly grouped as `duplicate_api_call` (see "Known limitations" above) — the silent-500 double-report was a separate *double-counting* bug, now fixed, not a false positive in this sense |
| Duplicate-classification precision (query-variants + duplicate-click) | 1/2 correct (50%) — path-only grouping | 2/2 correct (100%) — full-URL grouping |
| Evidence completeness | Free-text string, truncated to 200 chars, no structured status/timing/count | Structured: `method`, `path`, redacted `url`, `status`, `count`, timestamp evidence arrays |
| Owned-resource cleanup (cross-session collision) | N/A (no shadow-specific concern; validated once, applies to both modes since it's Task 2's ownership layer, not a detector) | **PASS**, live-validated end-to-end (see above), now permanently regression-tested |

**Not measured in this pass:** the roadmap's "completed checklist steps" and
systematic snapshot/action-result payload-size comparison — that requires
running a real multi-step exploratory flow end-to-end under both the
pre-route-split and post-route-split phase files and comparing byte counts,
which is a separate measurement exercise from the seeded-scenario detector
comparison this report covers. Flagging this explicitly rather than claiming
it was covered.

## Files touched by this validation pass

- Fixed: `scripts/action-scoped-collector.mjs` (browser-native-message already-surfaced guard —
  later renamed/reworked twice more; see the follow-up passes below)
- Added: `scripts/__tests__/fixtures/action-500-already-surfaced-browser-native.json`
- Added test: `scripts/__tests__/action-scoped-collector.test.mjs` (browser-native already-surfaced regression)
- Added: `scripts/__tests__/fixtures/live-drain-scenario{3,4,6,7,8,9}-*.json` (real captured bridge output, kept as evidence/fixtures)
- Added test: `scripts/test_session_resources.py` (`test_cross_session_cleanup_collision_on_a_shared_non_namespaced_resource`)
- Fixed (earlier in this pass): `scripts/wait-for-kibana.js` (IPv6/IPv4 loopback mismatch against a real Scout Kibana instance)
- This report: `scripts/reports/task8-live-validation-report.md`

## Follow-up pass: fixes from independent review of #281909

The items above shipped in the PR's initial commits. An independent review then ran the actual
committed code and fixtures rather than trusting the prose, and found the following, all fixed in
a follow-up commit:

- **Blocking — fixed:** `phases/0-guided-intake.md`'s own `gh issue view`/`gh pr view` call
  pointed at a now-hollow `phases/0-setup.md` Step 0b for the untrusted-content rules; Step 0b
  itself only points *onward* to `phases/0-github-input.md` since the route split, so the rules
  were unreachable on that path. Repointed directly at `0-github-input.md` with the same hard-stop
  wording, moved before the command (not after), and added
  `test_every_phase_file_gates_gh_content_fetches_behind_0_github_input` (renamed and widened in
  the second follow-up pass below — see that section) — a whole-`phases/`-directory sweep, not
  another single-file assertion, so a future file with its own ungated `gh` call fails
  automatically.
- **Fixed:** `phases/0-ccs.md` is read from two different call sites (Step 0a and Step 0e) but had
  only one return instruction ("Return to Step 0f"), which an agent reading straight through from
  the Step 0a visit could follow literally and skip Steps 0b–0e. Now names both return points
  explicitly. (Superseded in the second follow-up pass below, which splits this into two files
  instead of two sections of one file.)
- **Fixed:** the six `live-drain-scenario*.json` fixtures were committed but never asserted on —
  now parametrized into `action-scoped-collector.test.mjs`, including scenario 6's false positive
  (see "Known limitations" above), so a future reducer change that alters any of the six outcomes
  fails a test run instead of only surfacing on the next manual MCP pass.
- **Fixed:** the code comment above the browser-native-message guard cited
  `live-drain-scenario1-silent500.json`, a fixture that was never committed (it became
  `action-500-already-surfaced-browser-native.json` before this PR was opened). Corrected the
  reference and dropped the unverified "(and Firefox)" claim — only Chromium was captured.
- **Fixed (P2):** the browser-native-message guard was action-wide/presence-based, so one native
  500 message could wrongly suppress *every* 500 in the action regardless of path — see the
  "Follow-up fix" note under "Bug found and fixed" above.
- **Fixed (nits):** an f-string with no placeholders and a pointless space→newline `.replace()` in
  a curl-log assertion (now a plain `assertIn("-X DELETE", ...)`); two test names that
  over-promised relative to what they checked —
  `test_all_four_route_files_exist_and_are_nonempty` now verifies existence independently via
  `Path.is_file()` instead of relying on `setUp`'s `.read_text()` (which would error the whole
  class, not fail this test, if a file went missing), and
  `test_step_0a_routes_to_exactly_one_environment_file_per_case` now verifies the numbered route
  list's structure (exactly 3 cases, an exhaustive "Neither of the above" final case, exactly one
  target file per case) instead of only checking that all three filenames appear somewhere in
  Step 0a; `serve-seeded-harness.py` serving the process's CWD via an unset `directory` (now
  pinned to the script's own directory via `functools.partial`) plus
  `allow_reuse_address`/`daemon_threads` so a quick restart or Ctrl-C doesn't hang.
- **Fixed (placement):** `task8-live-validation-report.md` moved from `scripts/` (implies
  runnable) to `scripts/reports/`; `seeded-live-harness.html` and `serve-seeded-harness.py` moved
  from `scripts/__tests__/fixtures/` (implies consumed by automated tests, unlike these
  manually-invoked tools) to `scripts/manual-tools/`.

## Second follow-up pass: fixes from re-review of the first follow-up commit

A second independent review ran the follow-up commit above and found that the same-status-leakage
fix introduced a new bug of its own, and that the guided-intake security-rules fix from the first
pass created a different structural risk one level over from the one it closed. Both, plus several
smaller items, are fixed in this second follow-up commit:

- **Fixed — order-dependent false positive in the credit-claiming pass:** the first follow-up's
  fix consumed a shared native-message credit strictly in `requestedAt` order, checking credit
  availability *before* checking whether the event had its own path-specific console message. An
  event with its own message (e.g. "500 @ /api/b") could therefore steal the only credit a
  *different*, genuinely-silent event needed, purely depending on which one sorted first — same
  status, different paths, two 500s, one native message, one own-message: `/api/b` arriving before
  `/api/a` produced a spurious `silent_server_error` for `/api/a`; `/api/b` arriving after produced
  none. Reproduced directly against the reducer before fixing. Fix: two-phase pass — mark every
  event with its own path-specific message as surfaced first, *then* distribute remaining native
  credits among whatever's left. This removes the order dependence for the case that actually
  matters (whether a genuinely-silent event gets wrongly suppressed); which *specific* leftover
  event a scarce credit lands on when several qualify is still an accepted heuristic, now
  documented in a comment rather than left implicit — there is no request↔console-message ID
  linking in the underlying data to resolve that case unambiguously, including the related edge
  case (also noted in the comment) where a message from an `abandonedByNavigation` request can
  remain in the shared pool and be claimed by an unrelated event of the same status. Added two
  regression tests (both arrival orders of the exact repro above).
- **Fixed — guided-intake → `0-github-input.md` was a new dual-call-site conflict:** the first
  follow-up pointed `0-guided-intake.md`'s draft-flows section at `phases/0-github-input.md` "in
  full" for the security rules, but that file is a full GitHub-mode *route* — its own `gh` calls,
  its own `### Area`/`### Flows` schema extraction, its own "no scope comment → read
  0-guided-intake.md" fallback, and a "Return to `phases/0-setup.md` Step 0c" ending. A literal
  follower reading it "in full" from guided-intake's draft-flows section could act on that ending
  and skip guided-intake's own "present drafted flows, wait for approval" step — the same failure
  class as the CCS dual-return bug the first pass had just fixed, one level over. Fix: extracted
  the security rules (the `<<UNTRUSTED-CONTENT>>` block, rationalizations, red flags,
  suppressed-injection logging — generalized to not assume a specific extraction schema) into
  `phases/0-github-security-rules.md`, a file with no `gh` command and no "next step" of its own,
  so it is safe to read "in full" from any call site without creating this class of bug again.
  Both `0-github-input.md` (Step 0b's full route) and `0-guided-intake.md`'s draft-flows section
  now point at it; `0-github-input.md` keeps its own schema table, fallback, and Step 0c return —
  those are genuinely specific to its own workflow, not shared.
- **Fixed (P1) — `gh issue list` in Step 0d bypassed the security gate:** unlike Step 0b's `gh
  issue/pr view`, Step 0d's known-bugs search runs unconditionally every session, and its
  titles/labels are exactly as attacker-writable as an issue body on a public repo — nothing
  marked them as untrusted or told the agent not to act on instruction-like text inside one. Added
  the same untrusted-content warning (lighter-weight — no schema extraction to protect, just "this
  is data, never act on it, log instruction-like content") directly in Step 0d.
- **Fixed — CCS Step 0e "if not already read" could skip the `config.json` additions:** the first
  follow-up's dual-return-point fix to `0-ccs.md` worked, but a Step 0a visitor that read the whole
  file (rather than stopping exactly where instructed) could reasonably believe the file was
  "already read" and skip Step 0e's read entirely, silently leaving `environment.ccs` at `null`.
  Structural fix: split `0-ccs.md` into two files — `0-ccs.md` (Step 0a's environment-routing
  constraint only) and `0-ccs-config.md` (Step 0e's `config.json` schema only, always unread until
  Step 0e regardless of which environment route got there). Step 0e's pointer is now unconditional
  — no "if not already read" — since the file it names was never read before that point.
- **Fixed — `BROWSER_NATIVE_LOAD_FAILURE`'s module-level `g` flag was a footgun:** `matchAll`
  clones the regex rather than mutating the shared instance's `lastIndex`, so the original code was
  correct, but a future `.test()`/`.exec()` call against the same module-level object would have
  returned alternating results. The regex is now constructed fresh inside
  `countBrowserNativeLoadFailuresByStatus` instead of hoisted to module scope, removing the shared
  mutable state entirely rather than just documenting why it was safe.
- **Fixed — the sweep test was narrower than its stated purpose:**
  `test_every_phase_file_gates_gh_content_fetches_behind_0_github_input` only matched the literal
  `<NUMBER>` placeholder (`gh (?:issue|pr) view <NUMBER>`), so a future file writing
  `gh pr view $PR_NUMBER`, `gh pr view 281909`, or `gh api repos/elastic/kibana/issues/...` would
  fetch the same untrusted content and pass the sweep undetected. Renamed to
  `test_every_phase_file_gates_gh_content_fetches_behind_0_github_security_rules`, broadened the
  pattern to `gh (?:issue|pr) view\b|gh api\b`, and widened the glob from `phases/*.md` only to
  also cover `templates/*.md` and `scripts/*.md` (excluding `scripts/reports/`, which is
  retrospective prose about this exact fix, not agent-followed instructions, and false-positived
  on its own documentation when first tried).
- **Noted, not changed — a known heuristic, not a bug:** moving silent-server-error detection out
  of the per-signature loop into one action-wide pass changed Level 1 finding *ordering* in the
  output from grouped-by-signature to chronological across the whole action. No test depends on
  finding order, but a persisted collector-diff consumer would see the shape change.
- **Not fixed here — flagged as pre-existing and systemic:** the CCS restore/lock Python tests
  (`test_restore_timeout_excludes_deployment_lock_wait` and similar) use hardcoded
  `timeout=1.5`/`timeout=5` subprocess waits and fail intermittently under concurrent load,
  independently of this diff (which never touches those files). Two independent review passes have
  now hit this, with the failure set changing between runs as runtime varies — worth its own PR to
  scale or remove the hardcoded timeouts before a real regression in that file gets dismissed as
  flake. Left alone here to avoid scope creep into unrelated, pre-existing code.

### Files touched in this second follow-up pass

- Changed: `scripts/action-scoped-collector.mjs` (two-phase credit-claiming pass; regex moved
  inside `countBrowserNativeLoadFailuresByStatus`)
- Changed test: `scripts/__tests__/action-scoped-collector.test.mjs` (two new regression tests for
  the order-dependent false positive)
- Added: `phases/0-github-security-rules.md` (extracted, fetch/return-free rules file)
- Changed: `phases/0-github-input.md` (points at the new rules file; keeps its own schema/fallback/return)
- Changed: `phases/0-guided-intake.md` (draft-flows section points at the new rules file, not `0-github-input.md`)
- Changed: `phases/0-setup.md` (Step 0d gains an untrusted-content warning for `gh issue list`; Step 0a/0e CCS pointers updated for the file split below)
- Added: `phases/0-ccs-config.md` (config.json schema half of the CCS split)
- Changed: `phases/0-ccs.md` (now environment-routing only; config schema moved out)
- Changed test: `scripts/test_session_resources.py` (renamed/widened sweep test; new tests for the
  security-rules extraction, the `gh issue list` gate, and the CCS file split; fixed two
  pre-existing assertions — `ccs_doc`/`"mutation_pending"` — that pointed at content this pass moved)

### Final Python/JS suite counts (this second follow-up pass)

Run immediately before this commit, from a clean checkout of this branch:
- `action-scoped-collector.test.mjs`: 90/90 (88 baseline + 2 new order-dependence regression tests)
- `test_session_resources.py`, full suite: see the commit message for the exact count at commit
  time — deliberately not hardcoded here a second time, since a stale count in prose is exactly
  what this section exists to stop happening again. Run
  `python3 -m unittest test_session_resources -v` to get the current number directly.

## Third follow-up pass: fixes from re-review of the second follow-up commit

A third independent review found that the two-phase fix from the second pass still had one
presence-vs-count asymmetry left (applied to native messages, not yet to own-path messages), plus
an ordering inconsistency in the `gh issue list` gate added in that same pass. Both fixed here:

- **Fixed (P2) — own-path-message matching was presence-based, not count-based:** phase 1 of the
  two-phase fix (`surfacedByOwnMessage`) checked `consoleText.includes(path)`, which is a presence
  test against a *pathname* — it has no way to distinguish `/api/data?page=1` from
  `/api/data?page=2`, since a hand-authored message like `"500 @ /api/data"` never includes the
  query string. One such message could therefore wrongly cover **every** query-variant request to
  that path, not just the one it actually described — reproduced directly (two query-variant 500s,
  one message, zero findings; correct answer is one finding). Fixed by making phase 1 a
  consumable-credit pool too, keyed by exact `(status, path)`, counting actual message occurrences
  instead of testing presence — the same fix already applied to the native-message pool in the
  second pass, now applied consistently to both. Two new regression tests (one message covers
  exactly one of two variants; two messages cover both).
- **Also pinned, not changed — a known limitation, now tested instead of only commented:** an
  `abandonedByNavigation` request's native message (if the browser genuinely logged one) is never
  claimed by that request itself (excluded from `qualifying` entirely) and can be wrongly claimed
  by an unrelated real 500 of the same status from the shared credit pool. This was already
  documented in a code comment after the second pass; added a regression test that pins it as
  current, accepted, imperfect behavior — there is no request↔console-message ID link in the
  underlying data to resolve this without new instrumentation, which is out of scope for an
  experimental, shadow-only feature.
- **Fixed (P2) — the `gh issue list` untrusted-content warning was placed after the commands, not
  before:** every other gate in this skill (Step 0b's GitHub mode, `0-github-input.md`,
  `0-guided-intake.md`'s draft-flows section, `0-github-security-rules.md`) puts the hard-stop
  *before* the `gh` command specifically so an agent processing the file sequentially reads the
  rule before it could see attacker-controlled content. Step 0d's warning (added in the second
  pass) broke that pattern by appearing after the commands — worse, the test added alongside it
  explicitly asserted that ordering as correct. Moved the warning before the commands and inverted
  the test assertion to require the correct order.
- **Fixed (P3) — two of the three flaky CCS restore tests had an unnecessarily tight budget:**
  `test_restore_repairs_captured_snapshot_drift_without_modified_state` and
  `test_restore_timeout_excludes_deployment_lock_wait` both drove `restore-remote-cluster.py` with
  `--timeout-seconds 1`, but each needs several real subprocess/curl invocations (verify, PUT,
  re-verify) to finish inside that single second — `_run_curl` raises immediately once the shared
  deadline is exhausted, so process-spawn overhead alone was enough to flake under load. Neither
  test exercises the timeout path itself, so raising the budget to `5` (matching the majority of
  other tests in this file) doesn't weaken what they verify. Bumped the outer
  `communicate(timeout=8)` in the lock-wait test to `12` to keep margin. Left
  `test_restore_times_out_when_curl_hangs` untouched — its `--timeout-seconds 1` is load-bearing:
  it deliberately makes curl hang 10s and asserts the process reports a timeout in well under 6s,
  so it's deterministic, not flaky, and a larger budget would only slow it down without fixing
  anything.
  Verified with 3 isolated runs of each affected test and two full-suite runs (131/131 both times).
- **Not fixed — still deferred as pre-existing (P3, narrower now):** whether every timing-sensitive
  assumption elsewhere in the suite is fully load-independent hasn't been audited beyond the three
  tests named across all three review rounds. If a future run turns up a different flaky test, it's
  still worth its own pass rather than scope-creeping into this PR.

Verified after this pass: `action-scoped-collector.test.mjs` 95/95 (90 + 2 query-variant + 1
abandoned-message regression tests), `action-scoped-collector-bridge.test.mjs` 52/52,
`equivalence.test.mjs` 77/77, `test_session_resources.py` 131/131 (two full runs, both clean).

## Fourth follow-up pass: fixes from re-review of the third follow-up commit

A fourth review found the third pass's own-message fix was still per-key rather than truly global
(same message, different but overlapping keys), and pushed back — correctly — on treating the
abandoned/native-message limitation as something to document rather than fix, since a fix is in
fact feasible without new instrumentation:

- **Fixed (P2) — overlapping paths could still share one console credit:** the per-`(status,
  path)` *count* from the third pass still let two different keys double-spend the *same* message
  whenever one path is a substring of the other — `text.includes("/api/data")` is also true for a
  message about `/api/data/export`, so a single message wrongly covered two independent requests
  to genuinely different paths. Reproduced directly (two such requests, one message, zero
  findings; correct answer is one). Replaced the per-key counting with a single shared
  `consumedMessageIndices` Set: each qualifying event (in time order) claims the *first still
  ‑unconsumed* message matching its status and path, and that message can never be claimed again by
  any other event regardless of which key it also happens to satisfy. Two new regression tests
  (one message covers exactly one of two overlapping-path requests; two messages cover both).
- **Fixed (P2, previously only documented/pinned) — an abandoned request's native message could
  still cover an unrelated real 500:** the third pass added a test *pinning* this as accepted,
  current behavior rather than fixing it, reasoning there's no request↔console-message ID link to
  attribute a native message to a specific request. That reasoning still holds for *which* request
  produced a given native message, but it doesn't mean the ambiguity can't be resolved
  conservatively: the reducer now reserves one native-message credit per same-status
  `abandonedByNavigation` event — subtracted from the shared pool *before* any qualifying event can
  claim one — on the assumption the abandoned event did produce it. This deliberately trades one
  failure mode for a better one: it can occasionally flag a qualifying event that in fact had
  legitimate native coverage (once an abandoned event of the same status reserved it away), but
  that's a false positive a human can dismiss, versus the prior false negative (a genuinely silent
  error going unreported) that the whole `silent_server_error` detector exists to catch. Updated
  the previously-pinning test to assert the new (correct) outcome, and added a second case
  confirming the real event is still covered once the reservation is satisfied by a second native
  message.

Verified after this pass: `action-scoped-collector.test.mjs` 98/98, `action-scoped-collector-bridge.test.mjs`
52/52, `equivalence.test.mjs` 77/77, `test_session_resources.py` 131/131.

## Fifth follow-up pass: fixes from re-review of the fourth follow-up commit

A fifth review, re-reproducing directly, found the fourth pass's own-message fix was still
imprecise (global consumption alone didn't fix the underlying substring match), and pushed back
that the fourth pass's abandoned-reservation test only demonstrated the fix's benefit, never its
accepted cost:

- **Fixed (P2) — overlapping-path messages could be attributed to the wrong request:** the fourth
  pass made message consumption global (a message backs at most one event), but each check was
  still `text.includes(path)` — a plain substring test. With `/api/data` failing silently first
  (by `requestedAt`) and `/api/data/export` producing a real `"500 @ /api/data/export"` message,
  the *shorter* path consumed that message first (its substring matched), leaving the request that
  actually had its own message reported as silent instead — the exact inverse of the correct
  answer. This is not the same kind of irreducible ambiguity as the native-message pool (which
  carries no path at all): an own-path message *does* name a specific path, so misattributing it
  across genuinely different paths was fixable imprecision, not something to accept. Added
  `textMentionsExactPath`, which requires a match's boundaries on both sides to not be
  path-continuation characters (`/`, alphanumerics, `-_.~`) — a message about `/api/data/export` no
  longer satisfies a check for `/api/data`, in either time order. Strengthened the existing
  prefix-overlap test (which had only checked that exactly one finding existed, not which endpoint)
  to assert the specific, correct attribution in both time orders.
- **Addressed (P2) — abandoned-reservation false positives had no explicit test coverage:** fair
  finding — the fourth pass's regression test only demonstrated the reservation *fixing* a false
  negative, never exercised (or even named) the mirror-image case where the trade-off creates a
  false positive instead. Confirmed this direction is not fixable the way the path bug above was:
  `ConsoleEvent` is `{ type, text }` with no path *or timestamp*, so there is no data in this shape
  to decide whether a native message belonged to the abandoned request or a same-status real one —
  both readings of the identical fixture are equally valid. Added a companion test that pins the
  false-positive reading explicitly, with a comment stating the trade-off is deliberately accepted
  in both directions (a dismissable false positive is preferable to a missed silent error) rather
  than leaving that half of the trade-off implicit.

Verified after this pass: `action-scoped-collector.test.mjs` 101/101 (98 + 3 new regression
tests), `action-scoped-collector-bridge.test.mjs` 52/52, `equivalence.test.mjs` 77/77,
`test_session_resources.py` 131/131.
