---
name: exploratory-tester
description: >
  Use when exploring a Kibana feature area for unknown bugs, testing a PR for regressions,
  or validating user flows in a real browser — functional UI testing only. Triggers: "test this PR",
  "check for bugs", "exploratory testing", "browser testing", "manual testing".
  Not for API-only testing, performance/load testing, or accessibility-only audits.
---

# Exploratory Tester

> **[EXPERIMENTAL]** This skill is under active development. Findings, flow coverage, and report structure may change between sessions. Review all outputs carefully before acting on them — do not file bugs or escalate findings without independent verification.

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

**The entire invocation block below is optional.** If `Area` or `Flows` is missing, the agent runs a short guided intake.

```
Read and follow x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/SKILL.md [in parallel mode] [for issue/PR #N]
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
Session-dir: .exploratory-session/entity-analytics-20260714-093022  # optional — resume a prior session
Environment: profile <name>  # optional — or just: Environment: <name> if the profile file exists
Session-config: <path>       # optional — read all inputs from a YAML file instead of this block
```

Claude Code users who set up the symlink from Prerequisites (`ln -s "$(pwd)/x-pack/…/exploratory-tester" ~/.claude/skills/exploratory-tester`) can use the short form `exploratory-tester/SKILL.md` instead. Cursor and other IDEs use the full path above.

Guided intake: if `Area`/`Flows` missing, the agent asks interactively with defaults (`phases/0-setup.md`). Environment profiles: `Environment: profile <name>` loads a saved profile; the agent offers to save a new profile after validating a user-provided environment (`phases/0-setup.md`). Session-config: `Session-config: <path>` reads all inputs from YAML; copy `templates/session.example.yaml` as a template.

Each session writes its output to an isolated subfolder of `.exploratory-session/` named `<area-slug>-<YYYYMMDD-HHMMSS>`, so multiple agents can run sessions in parallel without interfering. To resume a prior session, pass its folder path as `Session-dir:`.

## Common Mistakes

Pre-session errors that make findings low-value before exploration even starts:

- **No `expected:` on flows** — findings become vague and unactionable; the agent has no oracle to cite
- **Running as `admin`** — permission bugs are invisible to admins; use `t2_analyst` or `platform_engineer`
- **No `Specs:` when testing a PR** — without specs the agent falls back to UX heuristics and misses acceptance criteria
- **Forgetting `Session-timeout:`** — long or many-flow sessions hit the 90 min default cap unexpectedly; set ≈ flows × 12 min
- **Using this for API-only, load, or accessibility testing** — scope is functional UI testing only; browser reproduction is required for every finding

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
