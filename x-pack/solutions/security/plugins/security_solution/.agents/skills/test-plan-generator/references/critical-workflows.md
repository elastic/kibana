# Critical-workflows registry

This file is the skill-side registry that links each team's critical-workflows map into the priority-assignment step. Read it whenever [`optional-scenarios.md`](optional-scenarios.md#priority-levels) points here — that is, before finalizing P0/P1/P2 for the generated scenarios.

---

## Contents

- [Purpose](#purpose)
- [Registry](#registry)
- [Lookup mechanism](#lookup-mechanism)
- [Using the map](#using-the-map)
- [Adding a new team](#adding-a-new-team)

---

## Purpose

The [Priority levels](optional-scenarios.md#priority-levels) definitions in `optional-scenarios.md` are intentionally abstract (impact, blast radius, security risk). They cannot encode team-specific domain knowledge — for example, which Security Solution workflows are considered P0 because a failure would break the analyst response loop. Each team owns that knowledge and maintains a critical-workflows map next to their code. This file lists the maps and defines how the skill picks the right one for the issue at hand.

---

## Registry

| Team | Owns | Map path |
|---|---|---|
| Security Solution | `x-pack/solutions/security/plugins/security_solution/` and related paths under `x-pack/solutions/security/` | [`../../../critical-workflows.md`](../../../critical-workflows.md) |

The registry is intentionally short — new rows are added by teams as they adopt the pattern (see [Adding a new team](#adding-a-new-team)).

---

## Lookup mechanism

Pick the map to consult using this precedence, top to bottom. Stop at the first match.

1. **Linked PR repo path (primary).** If the issue links one or more PRs (via the `Development` panel or a `Closes #NNN` reference), examine the files each PR touches. If any file path is under a registered team's `Owns` prefix in the [Registry](#registry) table, select that team's map. This is the most deterministic signal — the code being changed identifies the owning team unambiguously.
2. **Issue `Team: *` label (fallback).** If no PR is linked, or the linked PR's paths do not match any registered team, scan the issue's labels for `Team: *` entries. Match loosely against the team names in the registry (e.g. `Team: SecuritySolution`, `Team: CTI`, `Team: AWP: Platform` all resolve to the Security Solution map). Kibana's `Team:` label naming is inconsistent (`Team: X` vs `Team:X`) — normalise by lowercasing and removing whitespace before comparing.
3. **No-map fallback.** If neither signal yields a match, do **not** fail: use only the abstract P0/P1/P2 definitions in [`optional-scenarios.md`](optional-scenarios.md#priority-levels). Flag this in the plan's **Known Limitations** section with a `⚠️` note: `⚠️ No team critical-workflows map was applied — priority was derived from abstract impact rules only.` This makes the gap visible to the reviewer, who can either add the missing team map or accept the abstract priorities.

Never load more than one team's map for a single plan. If two teams' path prefixes both match the PR (rare, e.g. a cross-cutting refactor), pick the team that owns the majority of the changed paths.

---

## Using the map

Once a map is loaded:

- For every scenario, check its feature area against the map's P0 and P1 tables. If the scenario touches a listed workflow, default to that workflow's priority.
- A scenario inside a P0 workflow area may still be P1 or P2 if it is clearly narrow — e.g. a UI copy tweak inside the Alerts UI, or a formatting fix on an alert-triage tooltip. Use the scenario's own impact as the tie-breaker, not the area label alone.
- If the scenario touches a workflow that is **not** in the map, fall back to the abstract definitions. Absence from the map means "the team has not declared this critical" — treat it as at most P1 unless the abstract rules justify P0 (data loss, security risk, blocks core functionality).
- Do not silently downgrade a workflow the team marked P0 just because the abstract rules would rate it lower. The map represents the team's authoritative judgment; deviation requires a `⚠️` note in **Known Limitations** explaining why.

---

## Adding a new team

To add a team map:

1. Create `<team-area>/.agents/critical-workflows.md` in the team's code area, using the same table shape as the Security Solution seed at [`../../../critical-workflows.md`](../../../critical-workflows.md).
2. Add a row to the [Registry](#registry) table with the team name, the path prefix(es) they own, and a relative link to their map.

Keep the seed conservative — 3–5 clear P0 workflows is enough to make the pattern useful; the team extends over time.
