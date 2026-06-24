# SDLC Intelligence dashboards

Fleet integration package that installs Kibana dashboards, Elasticsearch index templates for the raw GitHub pipeline, and ES|QL views (`sdlc-github-raw-summary-view`, `sdlc-project-items-enriched-view`) for the SDLC Intelligence platform.

## Prerequisites

1. Install this **Fleet package** (see [package README](../README.md)).
2. Create a **GitHub** connector (`.github`) with ingest scopes (`read:org`, `read:project`, `repo`).
3. Import **SDLC GitHub catalog repos (GraphQL)** from **Workflows → Examples**, set `githubConnectorId`, and enable.

Additional workflows can be imported from `kibana/workflow/` in the package zip.

If you cannot install the Fleet package, ensure index templates exist before running ingest workflows.

## View dashboards

**Dashboards** app → search **SDLC**, or **Fleet → Integrations → Installed → SDLC Intelligence**.

| Dashboard | Saved object ID |
| --- | --- |
| SDLC GitHub sync overview | `sdlc-intel-executive-roadmap` |
| SDLC Raw sync by project | `sdlc-intel-phase-pipeline` |
| SDLC Raw items by project | `sdlc-intel-team-dimension` |

Direct links (default space): `/app/dashboards#/view/sdlc-intel-executive-roadmap` (and analogous paths for the other IDs).

Per-project page and item counts are served by the **`sdlc-github-raw-summary-view`** ES|QL view (installed with this package), aggregated from raw documents in `github-intel-raw-project-pages`.

Per-item hierarchy, team, and roadmap fields (extracted from raw `github-intel-project-items` payloads) are available via **`sdlc-project-items-enriched-view`**.

This package does not ship an Elastic Agent policy — it installs Kibana saved objects, index templates, and an ES|QL view.
