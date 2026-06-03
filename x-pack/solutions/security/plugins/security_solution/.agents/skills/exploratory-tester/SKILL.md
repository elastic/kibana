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

**Mode:** Single for new areas (full investigation chains). Parallel when `knowledge/` is populated — investigation limited to one level (`phases/2-explore.md`).

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
`Specs:`, `Session-timeout:`, `isolate:` optional. User-provided: add `Environment:` block with `api-key:` for ECH/ESS (`phases/0-setup.md`).

## Red Flags

| Thought | Reality |
|---|---|
| "This area looks fine — I didn't find anything" | Did you attempt every checklist step? Did step 3 use the noise index? |
| "All my test data is well-formed ECS" | Real customer data has non-ECS types. Use the noise index for data-view flows. |
| "Let me check the source code / test file selectors" | **Hard stop.** The implementation may be wrong. Navigate from what's visible in the browser. |
| "I don't know how this feature works" | Check specs → official docs → UI → test files for user flows. |
| "This error is expected" | Document it. User decides — then add to `knowledge/<area-slug>.md`. |
| "I called the API and it works" | UI and API hit different code paths. Browser reproduction required. |
## Phases

Execute in order — read each file before starting it:

| File | Contains |
|---|---|
| `phases/0-setup.md` | Prerequisites, environment boot, input parsing, config.json |
| `phases/1-wait-and-login.md` | Login, space/data/user setup, area readiness |
| `phases/2-explore.md` | Explore loop, checklist, mini-probe, findings |
| `phases/3-report.md` | Merge, filter noise, report, update knowledge |

Supporting files in `templates/`, `scripts/`, `knowledge/` — referenced inline from phase files.
