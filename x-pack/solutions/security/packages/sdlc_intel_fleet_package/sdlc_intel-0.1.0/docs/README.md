# SDLC Intelligence dashboards

Fleet integration package that installs Kibana dashboards, Elasticsearch index templates, ES|QL views, and ingest workflows for the SDLC Intelligence platform.

## Prerequisites

1. Install this **Fleet package** (see [package README](../README.md)).
2. Create **GitHub** (`.github`) and **Slack** (`.slack2`) connectors with appropriate OAuth scopes.
3. Enable ingest workflows in order (see package README): catalog → normalize → activity → enrich → cross-link → epic phases.

## View dashboards

**Dashboards** app → search **SDLC**, or **Fleet → Integrations → Installed → SDLC Intelligence**.

| Dashboard | Saved object ID | Data source |
| --- | --- | --- |
| SDLC Executive roadmap | `sdlc-intel-executive-roadmap` | `sdlc-epic-phases` |
| SDLC Project item pipeline | `sdlc-intel-phase-pipeline` | `sdlc-project-items-enriched-view` |
| SDLC Team dimension | `sdlc-intel-team-dimension` | `sdlc-team-dimension`, `sdlc-epic-phases` |
| SDLC GitHub sync overview | `sdlc-intel-raw-sync` | `sdlc-github-raw-summary-view` |

Direct links (default space): `/app/dashboards#/view/sdlc-intel-executive-roadmap` (and analogous paths for the other IDs).

## Data views

- **`sdlc-github-raw-summary-view`** — ES|QL aggregation of raw project page fetches from `github-intel-raw-project-pages`
- **`sdlc-project-items-enriched-view`** — ES|QL enrichment of `github-intel-project-items` with team, type, and roadmap fields
- **`sdlc-epic-phases`** — projected epic documents from the `github-project-epic-phases` workflow
- **`sdlc-team-dimension`** — org team catalog from the `github-build-team-dimension` workflow

This package does not ship an Elastic Agent policy — it installs Kibana saved objects, index templates, ES|QL views, and workflow definitions.
