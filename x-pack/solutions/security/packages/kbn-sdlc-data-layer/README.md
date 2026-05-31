# SDLC data layer

Shared Elasticsearch index definitions, team-dimension reference data, roadmap mappings, and analytics helpers for the SDLC intelligence platform.

**PRD & architecture traceability:** see [PRD_TRACEABILITY.md](./PRD_TRACEABILITY.md). **Architecture v1.1 delta** (draft update to `sdlc-platform-architecture.docx`): [ARCHITECTURE_v1.1_DELTA.md](./ARCHITECTURE_v1.1_DELTA.md).

## Indices

User-data indices (Discover/Dashboards friendly). Created by an admin running the setup workflow once.

| Index | Purpose |
| --- | --- |
| `github-intel-projects` | GitHub Project V2 metadata and field definitions |
| `github-intel-project-items` | Project board rows with planning fields and delivery rollups |
| `github-intel-project-views` | Project views and filter DSL |
| `github-intel-repos` | Org repository catalog |
| `github-intel-issues` | Issue documents linked to project items |
| `github-intel-pull-requests` | Pull request documents |
| `github-intel-comments` | Issue/PR comments |
| `github-intel-people` | Org members |
| `github-intel-teams` | GitHub org teams |
| `github-intel-relationships` | Explicit graph edges (epic ↔ issue/PR, project item ↔ content, team ↔ repo). Populated by `buildRelationships`. |

## Internal read APIs

Registered by `sdlcIntel` (requires `securitySolution` privilege):

| Route | Purpose |
| --- | --- |
| `GET /internal/sdlc/sync_status` | Sync freshness + index counts |
| `GET /internal/sdlc/roadmaps` | Executive roadmap groups + portfolio summary |
| `GET /internal/sdlc/epics` | Filtered epic phase documents |
| `GET /internal/sdlc/teams` | Team cards, matrix, epics-by-team |
| `github-intel-sync-state` | Sync cursors and watermarks (per-project sync status). Populated by `syncGithubProjects`, not at setup time. |
| `.github-sync-state` | **Deprecated alias** of `github-intel-sync-state` (created by setup workflow for old queries) |
| `sdlc-team-dimension` | Org team taxonomy and aliases |
| `sdlc-epic-phases` | Analytics-facing epic documents with P1–P8 phase gates |

## Setup

Run **`system-sdlc-setup-indices`** once as a user with `create_index` privileges (e.g. `elastic`). It creates all indices and seeds `sdlc-team-dimension`.

Direct URL: `/app/workflows/system-sdlc-setup-indices`

## Workflows

Managed by the `sdlcIntel` plugin:

- `system-sdlc-setup-indices` — one-time manual setup
- `system-sdlc-github-sync-orchestrator` — GitHub ingest every 4 hours (projects → org catalog → relationships → epic phases)

Set `githubConnectorId` on sync steps to a Stack Management **GitHub** (`.github`) connector (recommended). `githubToken` and `GITHUB_TOKEN` remain fallbacks for local development.
