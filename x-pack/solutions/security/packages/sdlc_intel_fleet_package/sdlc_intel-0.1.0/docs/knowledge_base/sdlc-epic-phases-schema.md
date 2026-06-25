# SDLC epic phases and gate schema

The `sdlc-epic-phases` index is the planning execution spine for SDLC Intelligence. It is populated by **github-project-epic-phases** and enriched by **github-enrich-epic-phases**.

## Document shape

Each document represents one **Epic** project item projected from GitHub Projects.

| Field group | Fields | Meaning |
|-------------|--------|---------|
| `epic.*` | `key`, `title`, `url`, `summary`, `owner`, `project_item_id` | Epic identity |
| `release.*` | `roadmap_stage`, `milestone`, `initiative`, `priority` | Roadmap placement |
| `teams.*` | `own_org_team`, `contributing_org_teams`, `cross_team` | Ownership |
| `links.*` | `prd_url`, `arch_url`, `project_url` | Planning artifact URLs |
| `phases.*` | per-phase `status`, counters | Phase gate results |
| `rollup.*` | `coverage_pct`, `gates_passed_pct`, `status` | Aggregate health |

## Phase gates (enrichment workflow)

| Phase | Pass condition (simplified) |
|-------|----------------------------|
| `p1_prd` | PRD URL or epic summary present |
| `p2_arch` | Architecture URL present |
| `p4_tickets` | At least one child ticket (`phases.p4_tickets.total > 0`) |
| `p5_prs` | At least one merged PR on child tickets |
| `p7_production` | Roadmap stage is GA / Production / Released (when applicable) |

`rollup.gates_passed_pct` = passed applicable gates ÷ applicable gates × 100.

`rollup.status`: `healthy` (coverage ≥ 80%), `at_risk` (≥ 40%), `blocked` (< 40%).

## Example ES|QL queries

**Thin epics (fewer than 3 child tickets):**

```esql
FROM sdlc-epic-phases
| WHERE phases.p4_tickets.total < 3
| KEEP epic.key, epic.title, epic.url, phases.p4_tickets.total, release.roadmap_stage
| SORT phases.p4_tickets.total ASC
```

**Failing or pending gates:**

```esql
FROM sdlc-epic-phases
| WHERE rollup.gates_passed_pct < 100
| KEEP epic.key, epic.title, rollup.gates_passed_pct, rollup.status, release.roadmap_stage
```

**Epics missing PRD link while on roadmap:**

```esql
FROM sdlc-epic-phases
| WHERE links.prd_url IS NULL AND release.roadmap_stage IS NOT NULL
| KEEP epic.key, epic.title, epic.url, release.roadmap_stage
```

## Agent analysis hints

- Compare `links.prd_url` last-modified (via `gdrive-intel-documents`) to epic activity for intent vs execution drift.
- Cross-reference `phases.p4_tickets.total` with `github-intel-epic-tickets` for per-repo breakdown.
- Use `teams.own_org_team` with `sdlc-team-dimension` aliases when explaining ownership gaps.
