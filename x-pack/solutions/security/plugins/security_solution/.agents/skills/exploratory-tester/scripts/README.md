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

## Running the Python tests

```bash
cd x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/scripts
python3 test_session_resources.py
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
    matching the contract `../phases/2-explore.md` depends on.
- `fixtures/` — DOM/console/network fixtures shared by all of the above.

This suite is also not part of Kibana CI (same reasoning as the Python
suite above). Run it locally before sending a change that touches any
detector script or `inject-detectors.js`.
