# Security Solution — Critical workflows

Domain-specific map used by the [`test-plan-generator`](../SKILL.md) skill to inform scenario prioritisation. Owned jointly by the Security Solution team (domain authority) and the `@elastic/security-engineering-productivity` team (format authority) — see [`critical-workflows.md`](critical-workflows.md) for the file-lookup convention.

**Last updated:** 2026-07-27

> **Seed — extend.** This file starts with a conservative list of universally-agreed P0 workflows. Add rows as the team validates the pattern on real test plans. Prefer accuracy over volume: a short, trusted list is more useful than a long, aspirational one.

## Unlisted workflows

If a workflow is not listed in the tables below, it is treated as **P2 by default**. The abstract impact rules in [`optional-scenarios.md`](optional-scenarios.md#priority-levels) can raise it to P1 or P0 when they apply (data loss, security risk, blocks core functionality). Never downgrade a workflow the team listed here based on abstract rules alone; see the deviation guidance in [`critical-workflows.md`](critical-workflows.md#using-the-map).

## How the skill uses this file

For every scenario it generates, the skill cross-references the scenario's feature area against the rows below. A scenario touching a P0-listed workflow defaults to P0 (unless the scenario itself is clearly narrow — e.g. a UI copy nit inside a P0 area). See [`critical-workflows.md`](critical-workflows.md) for the full lookup and fallback rules.

## P0 workflows (critical impact)

Failure blocks core functionality, causes data loss, or creates a security risk.

| Workflow | Feature area | Why critical | Owning sub-team |
|---|---|---|---|
| Rule execution and alert generation | Detection Engine | Alerts drive the entire security response loop; a broken engine means blind spots and missed incidents. | Detection Engine |
| Alert triage (open / close / assign) | Alerts UI | Analysts cannot respond to threats if alert state is inconsistent, lost, or unauthorised across users. | Alerts |
| RBAC enforcement across features | Security Platform | Broken RBAC either escalates privileges (security risk) or blocks legitimate access (workflow halt). | Security Platform |

## P1 workflows (high impact)

Failure significantly degrades an important workflow or user-facing feature.

<!-- team: add rows here as the pattern is validated. Keep the same columns as the P0 table above. -->

_None seeded yet — team will populate as the pattern proves itself._

## Adding a workflow

- Prefer concrete workflows over broad areas ("Rule execution" beats "Detection Engine works").
- The **Why critical** column must state user or business impact in one clause — not "it's important" or "core feature".
- If a workflow could equally be P0 or P1, keep it P1. Overuse of P0 dilutes signal.
