---
name: exploratory-tester
description: >
  Use when exploring a Kibana feature area for unknown bugs, testing a PR for regressions,
  or validating user flows in a real browser — not code analysis. Triggers: "test this PR",
  "check for bugs", "exploratory testing", "browser testing", "manual testing".
  Stateful and serverless environments.
---

# Exploratory Tester

Explore a Kibana Security Solution feature area through a real browser, collect structured evidence, and report findings classified by confidence.

**Execute phases 0 → 1 → 2 → 3 in strict order. Read each phase file before executing it.**

## Quick Reference

| Phase | Exit condition |
|---|---|
| **0 — Setup** — parse scope, boot/verify environment, write `config.json` | `config.json` written |
| **1 — Wait & Login** — login, create space + test data + user, confirm | User confirms: proceed |
| **2 — Explore** — 5-step checklist per flow, write findings immediately | Every flow has ≥1 entry in `findings-flow-<N>.md` |
| **3 — Report** — merge, classify, filter noise, present, update knowledge | User has reviewed the report |

## How to invoke

```
Read and follow exploratory-tester/SKILL.md [in parallel mode] [for issue/PR #N]
Area: <feature area>
Flows:
  - <flow name>
    entry: <path or description>
    expected: <correct outcome>
    timeout: <minutes>
    isolate: false    # optional — parallel mode only; default true (own space per flow)
Setup: <connector name>, role: <role>
Specs: <URL or file path to PRD / acceptance criteria / design doc>   # optional
Session-timeout: 90    # optional, total session cap in minutes (default 90)
```
`Specs:` and `Session-timeout:` are optional. If omitted, the agent falls back to the official docs at `https://www.elastic.co/docs/solutions/security`. For user-provided environments append an `Environment:` block — see `phases/0-setup.md`.

## Red Flags

| Thought | Reality |
|---|---|
| "This area looks fine — I didn't find anything" | Did you attempt every checklist step? Did step 3 use the noise index? |
| "All my test data is well-formed ECS" | Real customer data has non-ECS field types. Use the noise index for data-view flows. |
| "Let me check the source code / test file selectors" | **Hard stop.** The implementation may be wrong. Navigate from what's visible in the browser. |
| "I don't know how this feature works" | Check specs (`config.json → specs`) → official docs → UI → test files for user flows. |
| "This error is expected" | Document it. The user decides — then add to `knowledge/<area-slug>.md`. |
| "I called the API and it works" | UI and API hit different code paths. Browser reproduction required. |
| "The flow name is ambiguous" | Take a snapshot, navigate from what you see. Never skip. |

## Phases

Execute in order — read each file before starting it:

| File | Contains |
|---|---|
| `phases/0-setup.md` | Prerequisites, environment boot, input parsing, role resolution, config.json |
| `phases/1-wait-and-login.md` | Kibana readiness, login, space/data/user setup, area readiness |
| `phases/2-explore.md` | Explore loop, checklist, mini-probe, navigation, findings discipline |
| `phases/3-report.md` | Merge findings, filter noise, present report, update knowledge |
| `templates/finding-format.md` | Finding entry format and level rules |
| `templates/report-format.md` | report.md structure |
| `scripts/create-noise-index.sh` | Creates non-ECS test data — executed by Phase 1 |
| `scripts/create-flow-spaces.py` | Creates one Kibana space per parallel flow — executed by Phase 1 |
| `scripts/delete-flow-spaces.py` | Deletes per-flow spaces created by this session — executed by Phase 3 |
| `scripts/check-dom-anomalies.js` | DOM anomaly detector — pasted into `browser_evaluate` after each action |
| `scripts/classify-console.js` | Console classifier — pasted into `browser_evaluate` with messages array injected |
| `scripts/dedup-network.js` | Network duplicate detector — pasted into `browser_evaluate` with requests array injected |
| `knowledge/<area_slug>.md` | Known non-bugs and navigation patterns — loaded at Phase 0 end |
