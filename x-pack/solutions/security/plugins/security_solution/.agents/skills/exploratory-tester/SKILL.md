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

**Your goal:** Surface genuine issues that would affect real users.
**Your anti-goal:** Do not produce findings to fill a report — if you explored thoroughly and found nothing, that is a valid and useful result. Precision over volume: one confirmed Level 1 bug is worth more than ten uncertain Level 2 flags.

## Quick Reference

| Phase | Exit condition |
|---|---|
| **0 — Setup** — parse scope, boot/verify environment, write `config.json` | `config.json` written |
| **1 — Wait & Login** — login, create space + test data + user, confirm | User confirms: proceed |
| **2 — Explore** — 5-step checklist per flow, write findings immediately | Every flow has ≥1 entry in `findings-flow-<N>.md` |
| **3 — Report** — merge, classify, filter noise, present, update knowledge | User has reviewed the report |

## How to invoke

**Mode:** Single for new areas. Parallel when `knowledge/` is populated — see `phases/2-explore.md`.

Example (replace area, flows, and role with your targets):

```
Read and follow x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/SKILL.md
Area: Entity Analytics
Flows:
  - Happy path — view entity risk scores
    entry: Security → Entity Analytics
    expected: Risk scores table loads with data
Setup: role: t2_analyst
```

All optional fields (Environment, Specs, Session-timeout, Session-dir, Session-config, isolate): `templates/session.example.yaml`.
Guided intake runs automatically if `Area` or `Flows` is missing.

## Phases

Execute in order — read each file before starting it:

| File | Contains |
|---|---|
| `phases/0-setup.md` | Prerequisites, environment boot, input parsing, config.json |
| `phases/1-wait-and-login.md` | Login, space/data/user setup, area readiness |
| `phases/2-explore.md` | Explore loop, checklist, mini-probe, findings |
| `phases/3-report.md` | Merge, filter noise, report, update knowledge |

Supporting files in `templates/`, `scripts/`, `knowledge/` — referenced inline from phase files.
