# SIEM Readiness — Domain Knowledge and Architecture Guide

## Domain knowledge

### The five main SIEM categories

All data in SIEM Readiness is organized into five main categories:

| Category | Maps from `event.category` values |
|---|---|
| Endpoint | endpoint, file, process, registry, malware, driver, host, vulnerability |
| Identity | authentication, iam, session, user |
| Network | network, firewall, intrusion_detection, dns |
| Cloud | cloud, configuration |
| Application/SaaS | application, web, database, package, api |

The mapping lives in `server/lib/siem_readiness/fetchers/fetch_categories.ts` (`MAIN_CATEGORY_MAPPING`). A raw `event.category` value not in this table is **uncategorized** and is excluded from all views.

### An index can belong to multiple categories

An index like `logs-cloud_asset_inventory.asset_inventory-2` typically ingests documents with multiple `event.category` values (e.g., `cloud`, `network`, `host`). This means it appears in multiple category groups — Cloud, Network, and Endpoint — at the same time. The UI shows it once per category section it belongs to. This is expected and correct.

When counting "how many indices", count **unique indices**, not category-index pairs. If 5 unique indices are categorized but one appears in 3 categories, the total is still 5 — not 7.

### Only categorized data is shown

The UI and the agent both show only indices that are categorized into one of the five main groups. Uncategorized system indices (e.g. `.workflows-events`, `.kibana-*`, internal monitoring indices) are excluded from all SIEM Readiness views. If an index appears in the agent's response but not in the UI, it is likely uncategorized.

The dimension orchestrators in `server/lib/siem_readiness/dimensions/` filter items to categorized-only before building the payload. This is what makes agent and UI results consistent.

### Category assignment in payloads

- **Coverage**: items are already `CategoryGroup[]` — pre-grouped by category.
- **Continuity**: items are `PipelineStats[]`. Use `getIndexCategoryMap` to find which category a pipeline's indices belong to.
- **Quality**: items are `DataQualityResultDocument[]` filtered to categorized indices. Use `actionableFindings[].category` for grouping.
- **Retention**: items are `RetentionInfo[]` filtered to categorized indices, each with a `categories: MainCategories[]` field listing all categories that index belongs to.

### Thresholds and compliance rules

- **Pipeline failure rate**: critical at ≥ 1% (`CRITICAL_FAILURE_RATE_THRESHOLD` in `src/constants.ts`). Computed as `failedDocsCount / docsCount * 100`.
- **Retention**: FedRAMP minimum is 365 days. `retentionDays: null` means no explicit delete policy — data is kept forever — which is **compliant**. Only indices with an explicit retention shorter than 365 days are flagged.
- **ECS quality**: any index with `incompatibleFieldCount > 0` is flagged as having ECS mapping issues.
- **Coverage**: a category is considered covered if at least one of its indices has ingested documents.

### Serverless differences

In serverless Kibana, ingest pipeline node stats are unavailable. `PipelineStats.statsAvailable` will be `false` for all pipelines. Pipelines are still listed (they exist) but `docsCount` and `failedDocsCount` cannot be reported. ILM is also unavailable on serverless — retention is DSL-only for data streams; standalone indices don't exist.

---

## Core principle: enrich, don't multiply

When adding new data to SIEM Readiness — whether for a new UI column, a new agent insight, or a new health metric — **extend an existing flow rather than creating a new one**.

A new field in `PipelineStats` automatically flows through to the UI table, the HTTP route, and the agent tool. No new route, no new tool, no duplicated ES query, no second type to keep in sync.

**Signal that you're on the wrong path:** you're about to add a new route, a new agent tool, or a new attachment type to surface data that an existing dimension almost covers — it just doesn't have the right field yet.

### Concrete example — adding volume drop detection to continuity

The wrong approach:
- Add a new `/api/siem_readiness/get_volume_health` route
- Add a new `get_volume_tool` agent tool
- Write a separate ES query for volume data

The right approach:
- Add a `volume` field to `PipelineStats` in `src/types.ts` (this file)
- Compute it in `server/lib/siem_readiness/fetchers/fetch_pipelines.ts`
- Surface it as an `ActionableFinding` in `server/lib/siem_readiness/dimensions/get_continuity.ts` if it warrants an alert
- The UI table gets a new column; the agent gets it via the same `get_continuity` tool call it already makes

**One type change. One fetch update. UI and agent both benefit automatically.**

---

## How data flows through the feature

```
src/types.ts  ←  start here when adding a new metric
    ↓
server/lib/siem_readiness/fetchers/fetch_pipelines.ts   (raw ES I/O)
    ↓
server/lib/siem_readiness/dimensions/get_continuity.ts  (orchestrates fetchers + status functions → ContinuityPayload)
    ↓
server/lib/siem_readiness/routes/get_readiness_pipelines.ts  →  public/siem_readiness/ (UI)
    OR
server/agent_builder/tools/siem_readiness/get_continuity_tool.ts  →  agent
```

The same pattern applies to all four dimensions: **Coverage**, **Quality**, **Continuity**, **Retention**.

### Layer responsibilities

**`src/types.ts`** — The source of truth for all shared types: `PipelineStats`, `CoveragePayload`, `QualityPayload`, `ContinuityPayload`, `RetentionPayload`, `ActionableFinding`. A new metric starts as a type change here.

**`src/constants.ts`** — Thresholds and category definitions: `CRITICAL_FAILURE_RATE_THRESHOLD`, `CATEGORY_ORDER`, API path constants.

**`src/get_siem_readiness_statuses/`** — Pure status functions (no I/O). Both the UI hooks and the server-side dimension orchestrators import from here — same logic, both surfaces.

**`fetchers/`** — Raw ES I/O, one file per query. No verdict logic. If a new metric needs ES data, it belongs in the matching fetcher.

**`dimensions/`** — Per-dimension orchestrators. Compose fetcher results + status functions into `*Payload` objects with `status`, `summary`, `items`, and `actionableFindings`. This is where new metrics become findings.

**`routes/`** — Thin HTTP wrappers (~20 lines). UI's React Query hooks depend on these shapes — don't change the response structure without updating the UI.

**Agent tools** — Call dimension orchestrators directly (no HTTP). New fields in a payload are immediately available to the agent with no wiring changes.

---

## When is a new dimension/tool/route actually justified?

Only when the data has its own entity type and query scope that doesn't fit any existing dimension.

| Scenario | Right answer |
|---|---|
| New health metric for pipelines (volume, latency, silence) | Add a field to `PipelineStats` |
| New per-pipeline finding (e.g., config drift) | Add to `actionableFindings` in `get_continuity.ts` |
| New ECS compliance check | Add a field to `DataQualityResultDocument` / `getQuality` |
| New retention policy type | Add a field to `RetentionInfo` / `getRetention` |
| Genuinely new entity (e.g., Elastic Agent enrollment health) | New fetcher + dimension + route + tool |

---

## Key files

| Path | Purpose |
|---|---|
| `src/types.ts` | Shared types for all four dimensions |
| `src/constants.ts` | Thresholds, category order, API paths |
| `src/get_siem_readiness_statuses/` | Pure status functions — shared by UI and server |
| `server/lib/siem_readiness/fetchers/` | Raw ES fetchers, one per query |
| `server/lib/siem_readiness/dimensions/` | Per-dimension orchestrators |
| `server/lib/siem_readiness/routes/` | Thin HTTP wrappers for the UI |
| `server/agent_builder/tools/siem_readiness/` | Agent tools, one per dimension |
| `server/agent_builder/attachments/siem_readiness.ts` | Zod schemas + text formatters for all 4 dimensions |
| `server/agent_builder/skills/siem_readiness/siem_readiness_skill.ts` | Skill content and response structure |
| `public/siem_readiness/` | UI tabs and hooks |
