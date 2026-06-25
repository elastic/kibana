# SDLC GitHub intelligence data model

This document describes the GitHub-side indices installed by the **SDLC Intelligence** Fleet package. Use it when writing ES|QL, designing agent prompts, or interpreting coverage and scope-alignment findings.

## Index families

| Index pattern | Purpose |
|---------------|---------|
| `github-intel-issues` | Product-repo GitHub issues (activity + graph enrichment) |
| `github-intel-sdh-issues` | SDH-tracked issues (`sdh-*` repos and `label:sdh` in product repos) |
| `github-intel-pull-requests` | Pull requests with title, body, and linked issue URLs |
| `github-intel-project-items` | GitHub Project v2 items (raw + normalized hierarchy/roadmap fields) |
| `github-intel-relationships` | Edges: `parent_of`, `closes`, `customer_case_links_sdh`, `issue_references_design_doc`, etc. |
| `github-intel-epic-tickets` | Child tickets rolled up under epics |
| `github-intel-sync-state` | Ingest watermarks and workflow health |
| `sdlc-epic-phases` | Epic projection with phase gates and rollup metrics |
| `sdlc-team-dimension` | Org team catalog for project field matching |

## Key relationships

- **Epic spine:** `github-intel-relationships` with `relation: parent_of` links epic URL → child issue URL.
- **PR closure:** `links.closing_issues` on `github-intel-pull-requests`; `relation: closes` in relationships.
- **SDH feedback loop:** `customer_case_links_sdh`, `sdh_links_product` relationship types.
- **Design docs:** `issue_references_design_doc` edges to `gdrive-intel-documents` (metadata only).

## Common fields

### Issues (`github-intel-issues`)

- `content.title`, `content.body` — scope text for alignment analysis
- `hierarchy.epic`, `hierarchy.ticket_type`, `hierarchy.parent_issue_ref`
- `team_attribution.engineering_team`, `team_attribution.org_teams`
- `entity.url`, `repository.full_name`

### Pull requests (`github-intel-pull-requests`)

- `pull_request.title`, `pull_request.body`
- `links.closing_issues`, `links.linked_issues`
- `hierarchy.epic` when enriched from linked issues

### Epics (`sdlc-epic-phases`)

- `epic.key`, `epic.title`, `epic.url`, `epic.summary`
- `phases.p4_tickets.total` — child ticket count
- `rollup.gates_passed_pct`, `rollup.coverage_pct`, `rollup.status`
- `links.prd_url`, `links.arch_url`
- `release.roadmap_stage`, `teams.own_org_team`

## ES|QL views

Prefer packaged views for dashboards and agents:

- `sdlc-project-items-enriched-view` — normalized project items with team/roadmap columns
- `sdlc-epic-tickets-by-repo-view` — epic child tickets and PR linkage
- `sdlc-design-doc-coverage-view` — GitHub ↔ Google Drive design doc edges
- `sdlc-feedback-loop-enriched-view` — Case → SDH → product three-hop view

## Ingest order

Run catalog → normalize → activity → enrich → cross-link workflows before planning or agentic analysis. See the package README for the recommended workflow order.
