# Critical-workflows lookup

This file documents how the skill picks the right team's critical-workflows map when assigning scenario priority. Read it whenever [`optional-scenarios.md`](optional-scenarios.md#priority-levels) points here — that is, before finalizing P0/P1/P2 for the generated scenarios.

---

## Contents

- [Purpose](#purpose)
- [File-lookup convention](#file-lookup-convention)
- [Lookup precedence](#lookup-precedence)
- [Using the map](#using-the-map)
- [Adding a new team](#adding-a-new-team)

---

## Purpose

The [Priority levels](optional-scenarios.md#priority-levels) definitions in `optional-scenarios.md` are intentionally abstract (impact, blast radius, security risk). They cannot encode team-specific domain knowledge — for example, which Security Solution workflows are considered P0 because a failure would break the analyst response loop. Each team owns that knowledge and maintains a critical-workflows map inside this skill folder, gated by CODEOWNERS so both the skill team and the owning dev team must approve any change.

---

## File-lookup convention

Team maps live alongside this file, named:

```
references/critical-workflows-<team-slug>.md
```

Where `<team-slug>` is the lowercased, hyphenated team name (e.g. `security-solution`, `observability-alerting`). The currently seeded map is [`critical-workflows-security-solution.md`](critical-workflows-security-solution.md). No separate registry file is needed — the naming convention is the registry.

CODEOWNERS enforces dual approval on each team map: the skill team (`@elastic/security-engineering-productivity`) gates the format, and the owning dev team gates the content. Neither can merge changes alone.

---

## Lookup precedence

Pick the map to consult using this precedence, top to bottom. Stop at the first match.

1. **Linked PR repo path (primary).** If the issue links one or more PRs (via the `Development` panel or a `Closes #NNN` reference), examine the files each PR touches. If any file path is under a known team area, derive the team slug from that area (e.g. paths under `x-pack/solutions/security/` → `security-solution`) and load `critical-workflows-<team-slug>.md` from this directory. This is the most deterministic signal — the code being changed identifies the owning team unambiguously.
2. **Issue `Team: *` label (fallback).** If no PR is linked, or the linked PR's paths do not match any known team area, scan the issue's labels for `Team: *` entries. Normalise each label (lowercase, drop whitespace and the `team:` prefix) and match against the `<team-slug>` portion of the available map filenames. Sub-team labels resolve to the parent team's map (e.g. `Team: CTI`, `Team: AWP: Platform` → `security-solution`) when only the parent has a seeded map.
3. **No-map fallback.** If neither signal yields a match, do **not** fail: use only the abstract P0/P1/P2 definitions in [`optional-scenarios.md`](optional-scenarios.md#priority-levels). Flag this in the plan's **Known Limitations** section with a `⚠️` note: `⚠️ No team critical-workflows map was applied — priority was derived from abstract impact rules only.` This makes the gap visible to the reviewer, who can either add the missing team map or accept the abstract priorities.

Never load more than one team's map for a single plan. If two teams' path prefixes both match the PR (rare, e.g. a cross-cutting refactor), pick the team that owns the majority of the changed paths.

---

## Using the map

Once a map is loaded:

- For every scenario, check its feature area against the map's P0 and P1 tables. If the scenario touches a listed workflow, default to that workflow's priority.
- A scenario inside a P0 workflow area may still be P1 or P2 if it is clearly narrow — e.g. a UI copy tweak inside the Alerts UI, or a formatting fix on an alert-triage tooltip. Use the scenario's own impact as the tie-breaker, not the area label alone.
- If the scenario touches a workflow that is **not** in the map, the default is **P2**. The abstract impact rules in [`optional-scenarios.md`](optional-scenarios.md#priority-levels) can raise it to P1 or P0 when they apply (data loss, security risk, blocks core functionality).
- Do not downgrade a workflow the team marked P0 just because the abstract rules would rate it lower. The map represents the team's authoritative judgment; deviation requires a `⚠️` note in **Known Limitations** explaining why.

---

## Adding a new team

To add a team map:

1. Create `references/critical-workflows-<team-slug>.md` in this directory, using [`critical-workflows-security-solution.md`](critical-workflows-security-solution.md) as a template.
2. Add a CODEOWNERS rule for the new file requiring both `@elastic/security-engineering-productivity` (skill team, format authority) and the owning dev team GitHub handle (domain authority).
3. Add the team slug and its associated path prefix(es) or `Team: *` label variants to the [Lookup precedence](#lookup-precedence) section above, so the skill can resolve the team from either signal.

Keep the seed conservative — 3–5 clear P0 workflows is enough to make the pattern useful; the team extends over time.
