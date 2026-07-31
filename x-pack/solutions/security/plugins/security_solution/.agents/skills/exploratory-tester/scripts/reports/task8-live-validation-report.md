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
`test_session_resources.py` (126/126 tests pass) so this exact live-validated
path has permanent regression coverage — it asserts on curl's own invocation
log, not just exit codes, so it would catch a bug that produced the right
exit code by accident while still wrongly enqueuing a delete for a foreign
session's resource.

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

- Fixed: `scripts/action-scoped-collector.mjs` (`isBrowserNativeLoadFailureFor` guard)
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
  `test_every_phase_file_gates_gh_content_fetches_behind_0_github_input` — a whole-`phases/`-directory
  sweep, not another single-file assertion, so a future file with its own ungated `gh` call fails
  automatically.
- **Fixed:** `phases/0-ccs.md` is read from two different call sites (Step 0a and Step 0e) but had
  only one return instruction ("Return to Step 0f"), which an agent reading straight through from
  the Step 0a visit could follow literally and skip Steps 0b–0e. Now names both return points
  explicitly.
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
