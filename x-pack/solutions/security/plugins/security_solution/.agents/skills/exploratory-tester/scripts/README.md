# exploratory-tester scripts

Helpers invoked by the phase documents in `../phases/`. `session_resources.py`
is the shared library; everything else is a CLI entry point or a document
containing a runnable template.

`check-dom-anomalies.js`, `classify-console.js`, and `dedup-network.js` are the
three canonical detector scripts Phase 2 pastes into `browser_evaluate`.
`inject-detectors.js` is a **generated** bundle of the same three detectors
behind a `window.__et` bridge, so a flow can inject it once (and again after
each `browser_navigate`) instead of pasting all three scripts at every
checklist step. See `__tests__/` below for how it's generated and verified.

`action-scoped-collector.mjs` is an experimental, **shadow-only** alternative
network/console classifier (`collector_mode: shadow`, default `legacy` —
never drives findings). See `action-scoped-collector.md` for the design and
`action-scoped-collector-spike.md` for the one-time manual capability check
required before enabling it in any real session.

`knowledge-hash.py` computes a knowledge markdown file's SHA-256 and its
ordered list of top-level (`##`) section headings, and supports a
`--verify <sha256>` mode that exits non-zero on a mismatch or missing file
for a simple bash conditional. It backs the hash-gated knowledge-file
approval described in `../phases/0-setup.md` Step 0g: an approval is
recorded against exact file content, not just a path, so an edit to the
file after approval (most commonly `../phases/3-report.md` Step 3d's own
end-of-session write) is always detected and re-confirmed rather than
silently reused. Both `../templates/subagent-prompt.md` and
`../phases/2-flow-core.md` call it with `--verify` immediately before a
worker reads the file.

`parse-findings.py` and `render-report.py` move `../phases/3-report.md` Step
3a's report bookkeeping out of manual, per-session instructions and into
deterministic scripts, while the Markdown findings files (and the model's
narrative judgment writing them) stay exactly as they were.

- `parse-findings.py` reads every `findings-flow-<N>.md` in a session
  directory and writes `findings.jsonl`: one `flow_header` record per file
  (from its `<!-- flow: ... -->` comment) and one `finding` record per
  `## Finding: ...` / `## Observation: ...` block. Each finding record
  carries a `signature` — a hash of level + checklist step + normalized
  title + normalized evidence facts — that `render-report.py` uses to group
  the same underlying bug across flows, replacing the old, fragile
  `type` + first-100-characters-of-`current_behavior` key. Exits non-zero if
  a block is missing `Level` or `Current behavior`; a finding is never
  silently dropped.
- `render-report.py` reads that JSONL sidecar plus `config.json` and writes
  the full `report.md` skeleton (`../templates/report-format.md`): header
  metadata, the Timing & Cost table, Summary counts, and Level 1/2/3
  findings in full finding format. A finding grouped from 2+ flows keeps the
  **union** of every occurrence's Evidence bullets (never just the first
  occurrence's) plus a trailing `Also seen in flows: ...` line naming every
  flow, not just "2+". Judgment calls the script cannot make from data alone
  — why a flow is `blocked`/`not started`/genuinely `timed out` rather than
  `completed`, which checklist steps were skipped, and which findings Step
  3b decided to suppress — are supplied via an `--overrides` JSON file
  rather than guessed; suppressing a Level 1 finding is a hard error. See
  either script's own module docstring for the full `--overrides` schema and
  CLI reference, and `scripts/test_report_bookkeeping.py` for worked
  examples (including golden `report.md` fixtures under
  `__tests__/fixtures/report-session-basic*`).

## Running the Python tests

```bash
cd x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/scripts
python3 test_session_resources.py
python3 test_report_bookkeeping.py
```

Requires only the standard library. Add `-k <pattern>` via `unittest` to narrow
a run. Pass `-B` there: importing the suite as a module caches its bytecode
before any code in it runs, and this directory is inside a git checkout with no
`__pycache__` ignore rule.

```bash
python3 -B -m unittest test_session_resources -k reservation
```

The suite is not part of Kibana CI: it is Python, and Kibana's pipelines have no
Python test step (the sibling suite at `.agents/scripts/test_session_metrics.py`
is in the same position). Run it locally before sending a change that touches
anything in this directory or in `../phases/`.

## What the tests cover

Beyond the library's own behaviour, the suite asserts properties of the phase
and template documents, because the agent executes those code blocks verbatim:

- Markdown fences are balanced and never nested, so no block is silently
  swallowed into a neighbouring one.
- No document uses `curl -X HEAD`, which stalls for the whole timeout against
  keep-alive servers; use `-I` instead.
- Every setup mutation is registered for cleanup, and resources are reserved
  before the request that creates them.
- Ownership is never downgraded silently: discarding a reservation this session
  made requires `--confirm-preexisting`, so a resource cannot vanish from both
  the pending list and the cleanup list.
- `../phases/0-setup.md`'s environment/GitHub-input/CCS routes (Steps 0a/0b)
  point to on-demand files — `0-managed-environment.md`,
  `0-user-provided-environment.md`, `0-github-input.md`, `0-ccs.md` — instead
  of inlining every route's content on every session. The untrusted-content
  security rules in `0-github-input.md` are never dropped or weakened by that
  move, and the hard-stop pointer to it is read before any `gh` command runs.

## `__tests__/` — the detector-injector JS harness

`inject-detectors.js` is generated, not hand-written. If you edit
`check-dom-anomalies.js`, `classify-console.js`, or `dedup-network.js`,
regenerate it and re-verify before committing:

```bash
cd x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/scripts
node __tests__/build-injector.mjs      # regenerates inject-detectors.js
node __tests__/equivalence.test.mjs    # verifies it
```

Requires `jsdom`, available via the Kibana root `node_modules` — run from
inside a normal `yarn kbn bootstrap`'d checkout.

- `injector-builder.mjs` — the pure generation logic (extracting each
  detector's inner function out of its paste-mode IIFE and assembling the
  `window.__et` bridge). Both `build-injector.mjs` and
  `equivalence.test.mjs` import this, so there is exactly one place that
  knows how to produce `inject-detectors.js`.
- `build-injector.mjs` — thin CLI: reads the three canonical scripts, calls
  `injector-builder.mjs`, writes `../inject-detectors.js`.
- `equivalence.test.mjs` — no test framework, plain assertions, exits
  non-zero on failure. Covers:
  - **Correctness** — each detector classifies its fixtures as expected.
  - **Equivalence** — paste-mode and inject-mode (and the generated
    `inject-detectors.js` itself) produce byte-identical output for every
    fixture.
  - **Drift gate** — the committed `inject-detectors.js` is byte-identical
    to what `injector-builder.mjs` would produce right now from the
    canonical sources. Fails loudly if a detector was edited and the
    generated file wasn't regenerated to match.
  - **Lifecycle** — the bridge-missing/fallback condition, reinjection
    after a simulated navigation, and idempotency of redundant reinjection,
    matching the contract `../phases/2-flow-core.md` depends on.
- `fixtures/` — DOM/console/network fixtures shared by all of the above.

This suite is also not part of Kibana CI (same reasoning as the Python
suite above). Run it locally before sending a change that touches any
detector script or `inject-detectors.js`.

## `action-scoped-collector.mjs` and its test suite

```bash
cd x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/scripts
node __tests__/action-scoped-collector.test.mjs
```

Pure reducer, no browser dependency — `reduceAction(events, priorState)`
classifies pre-collected `{network, console, dom}` events (see the module's
own header comment for the exact shape) into the same
`{level1, level2, level3, suppressed}` convention the other detectors use,
plus a `state` object to carry cumulative history (e.g. a pending request
that's still pending several checklist steps later) between calls in the
same flow. Also runnable as a CLI (`node action-scoped-collector.mjs
<events.json> [<prior-state.json>]`) — `phases/2-flow-core.md` invokes it
this way in shadow mode.

The actual event collection happens elsewhere: Playwright-side, inside a
`browser_run_code_unsafe` call, because that sandbox has no `require`/`import`
and can't execute this module directly. See `action-scoped-collector.md` for
that bridge script, and `action-scoped-collector-spike.md` for the manual,
one-time verification that the bridge's core assumption (listeners installed
in one tool call are still there in a later, separate one) actually holds
against your MCP setup — required reading before ever setting
`collector_mode: shadow`.

`action-scoped-collector.test.mjs` covers: silent 5xx with no matching
console error (and that an *abandoned* 5xx — headers arrived, then torn down
by navigation — is never double-reported as both `request_abandoned_by_navigation`
and `silent_server_error`), pending-vs-stuck-vs-abandoned-by-navigation
classification (including settle-then-repend and same-drain settle+repend,
both disambiguated by the bridge-assigned `id` — see the reducer's own
header comment), a request whose headers arrived but whose body is still
streaming (must read as pending, not settled), a same-URL retry right after
an abandoned (never-truly-settled) attempt not being misread as a
duplicate/retry/repeat, meaningfully different query strings never being
grouped as duplicates, concurrent duplicate calls vs. an intentional
retry-after-failure vs. the same call repeated far apart, known-noise
(polling) suppression that still lets a genuinely failing polling endpoint
through, deterministic spinner-timing escalation, URL redaction (including a
parity check against the bridge doc's own inline copy of the same logic, a
malformed-encoding fixture, a hash-fragment case, the full credential-shaped
param-name list, and the per-value hashed placeholder that keeps different
secret values from collapsing into one signature), a duplicate-window check
against total span rather than only adjacent gaps, a CLI-vs-module
classification round trip, and — parametrized over the real
`__tests__/fixtures/live-drain-scenario*.json` captures — the six scenarios
from `reports/task8-live-validation-report.md`'s live browser validation
pass, including a documented false positive on rapid sequential polling
(tracked, not silently expected to disappear on the next reducer change).

Those `live-drain-scenario*.json` fixtures, and the browser-native-500
regression fixture above them, were captured against `manual-tools/`'s local
harness — `seeded-live-harness.html` (served by `serve-seeded-harness.py`,
default port 8931) reproduces each scenario's real DOM/console/network
signature via genuine `fetch()`/`AbortController`/`history` calls, driven
through a live `browser_run_code_unsafe` bridge. It's a manual tool, not
exercised by any automated test here — run it yourself (`python3
manual-tools/serve-seeded-harness.py`) if you need to re-capture a scenario
or add a new one; see `reports/task8-live-validation-report.md` for the full
methodology and results.

```bash
node __tests__/action-scoped-collector-bridge.test.mjs
```

The bridge snippets in `action-scoped-collector.md` (Install/Drain) only ever
run inside a live `browser_run_code_unsafe` VM sandbox — no prior test here
executed that code at all, only the reducer it feeds. Three separate reviews
of this feature each found a real bug living exclusively in that
never-executed bridge logic. `action-scoped-collector-bridge.test.mjs`
extracts the actual Install/Drain/Uninstall snippets straight out of the doc
(never a hand-copied duplicate) and runs them against a fake, `EventEmitter`-
based Playwright `page`/`Request`/`Response`/console-message stand-in,
covering: idempotent listener attachment vs. non-idempotent per-flow state
reset, `response` (headers) vs. `requestfinished` (true completion) — a
stalled body must still read as pending after headers arrive —
navigation-abandonment scoped to the specific frame that navigated (an
unrelated iframe's request is untouched by a main-frame nav, and a child
frame's own navigation abandons only its own requests), a same-document
(`history.pushState()`) navigation — which Playwright reports via
`framenavigated` exactly like a real one — never abandoning a still-running
request (only a navigation preceded by an actual `isNavigationRequest()`
request does), a cancelled/superseded navigation request never poisoning a
*later* same-document navigation on the same frame — within one flow or
across a flow boundary — into wrongly abandoning something, the navigating
request itself (and its redirect hops) never being abandoned by the very
navigation it drives even when its own body is still streaming past commit,
`request.frame()` throwing (Service Worker requests, and navigation
requests issued before their frame exists — both documented Playwright
behavior) never aborting that request's own buffering or wrongly scoping it
to any frame's navigation, console-text redaction including per-value
differentiation, Uninstall removing exactly the collector's own six
listeners (never an unrelated listener sharing the same event) and clearing
state so a later install() re-attaches cleanly, and a second flow's
install() call not inheriting a previous flow's leftover open request or
console text.
