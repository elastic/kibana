# SDLC team dimension guide

The `sdlc-team-dimension` index maps GitHub organization teams to values used in GitHub Project fields. It is built by **github-build-team-dimension** from `github-intel-teams`.

## Purpose

Project items store team ownership in heterogeneous field values (`Team`, labels, epic anchor fields). The team dimension provides a **canonical org team catalog** with aliases for matching project item values to engineering ownership.

## Document fields

| Field | Description |
|-------|-------------|
| `org_team.key` | Stable team key |
| `org_team.name` | Display name |
| `org_team.members_count` | Member count from GitHub |
| `subteams` | Nested team slugs |
| `aliases.project_team_values` | Values seen in Project v2 Team fields |
| `aliases.github_labels` | Label patterns (e.g. `Team:security`) |
| `aliases.github_org_slugs` | GitHub team slugs |

## Coverage analysis use cases

**Roadmap items without team assignment** — query `github-intel-project-items` where `roadmap.stage` exists but `team_attribution.engineering_team` is empty, then check whether `epic_anchor.team` or project Team field values fail to match any `aliases.project_team_values`.

**Cross-team epics** — `sdlc-epic-phases.teams.cross_team == true` or multiple `contributing_org_teams`.

**Org team ↔ epic owner mismatch** — compare `epic.owner` / assignee emails with `org_team` membership (via `github-intel-people` when populated).

## ES|QL examples

**Enriched items with unassigned project team:**

```esql
FROM sdlc-project-items-enriched-view
| WHERE roadmap_stage IS NOT NULL AND project_team == "unassigned"
| STATS items = COUNT(*) BY roadmap_stage, project_title
| SORT items DESC
```

**Epics by owning org team:**

```esql
FROM sdlc-epic-phases
| STATS epics = COUNT(*) BY teams.own_org_team, release.roadmap_stage
| SORT epics DESC
```

## Prerequisites

Run **github-catalog-teams**, **github-catalog-team-members**, and **github-build-team-dimension** before relying on team attribution in coverage analysis or agent workflows.
