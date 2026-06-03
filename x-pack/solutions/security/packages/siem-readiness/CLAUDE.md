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

- **Coverage**: items are `CategoryGroup[]` — already grouped by category (this IS the categories data).
- **Continuity**: items are ALL `PipelineStats[]` including uncategorized pipelines. The agent tool and the UI tab **both call `filterPipelinesByCategories`** (from `src/filter_pipelines_by_categories.ts`) to reduce to categorized-only before displaying. Use exact-match against the category index list.
- **Quality**: items are ALL `DataQualityResultDocument[]`. Agent tools filter and enrich; UI filters client-side using `getIndexCategoryMap`.
- **Retention**: items are ALL `RetentionInfo[]`. The agent tool and the UI tab **both call `filterRetentionItemsByCategories`** (from `src/filter_retention_items_by_categories.ts`). Note: retention items carry data stream names while categories indices carry backing index names — use contains-match (`idx.indexName.includes(item.indexName)`) when joining them.

### Shared filtering predicates

The filtering logic for continuity and retention is extracted into pure functions in this package so that **both the agent tool and the UI tab use the same predicate**. This is what makes parity tests possible: a test can call the shared function with a fixture and assert it produces the same items as the tool handler.

| Function | Match strategy | Used by |
|---|---|---|
| `filterPipelinesByCategories(pipelines, categoriesData)` | Exact-match on backing index name | `getContinuityTool` + `continuity_tab.tsx` |
| `filterRetentionItemsByCategories(items, categoriesData)` | Contains-match (data stream ⊂ backing index) | `getRetentionTool` + `retention_tab.tsx` |
| `getIndexCategoryMap(categoriesData)` | Exact-match, returns Map for lookups | used by the above + quality tool |

**If you change how items are filtered** (e.g., different matching strategy, new exclusion rules), change the shared function — not the tool or the tab independently.

### Thresholds and compliance rules

- **Pipeline failure rate**: critical at ≥ 1% (`CRITICAL_FAILURE_RATE_THRESHOLD` in `src/constants.ts`). Computed as `failedDocsCount / docsCount * 100`.
- **Retention**: FedRAMP minimum is 365 days. `retentionDays: null` means no explicit delete policy — data is kept forever — which is **compliant**. Only indices with an explicit retention shorter than 365 days are flagged.
- **ECS quality**: any index with `incompatibleFieldCount > 0` is flagged as having ECS mapping issues.
- **Coverage**: a category is considered covered if at least one of its indices has ingested documents.

### Serverless differences

In serverless Kibana, ingest pipeline node stats are unavailable. `PipelineStats.statsAvailable` will be `false` for all pipelines. Pipelines are still listed (they exist) but `docsCount` and `failedDocsCount` cannot be reported. ILM is also unavailable on serverless — retention is DSL-only for data streams; standalone indices don't exist.

---

## Data flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│  fetchers/  (raw ES I/O, no filtering, one file per query)              │
│                                                                         │
│  fetch_pipelines     — node stats API → PipelineStats[]                 │
│  fetch_retention     — ILM + DSL policies → RetentionInfo[]             │
│  fetch_categories    — event.category aggregation → CategoriesResponse  │
│  (quality results fetched inline in get_quality.ts)                     │
└───────────────────┬─────────────────────────────────────────────────────┘
                    │ raw data, no filtering
                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  dimensions/  (per-dimension orchestrators)                             │
│                                                                         │
│  get_coverage   — calls fetch_categories + checks detection rules       │
│                   → CoveragePayload (already grouped by category)       │
│  get_continuity — calls fetch_pipelines → ContinuityPayload             │
│  get_retention  — calls fetch_retention → RetentionPayload              │
│  get_quality    — fetches ECS check results → QualityPayload            │
│                                                                         │
│  Each returns { status, summary, items[], actionableFindings[] }        │
│  Items are ALL raw results — no category filtering at this layer        │
└───────────────┬─────────────────────┬───────────────────────────────────┘
                │                     │
                ▼                     ▼
┌──────────────────────┐   ┌──────────────────────────────────────────────┐
│  routes/  (HTTP)     │   │  agent_builder/tools/siem_readiness/         │
│                      │   │                                              │
│  Thin wrappers that  │   │  Each tool calls its get_x orchestrator AND  │
│  call get_x and      │   │  fetch_categories in parallel, then filters  │
│  return the payload  │   │  items + enriches findings with categories   │
│  as-is over HTTP     │   │  before returning to the agent               │
└──────────┬───────────┘   └──────────────────┬───────────────────────────┘
           │                                  │
           ▼                                  ▼
┌──────────────────────┐   ┌──────────────────────────────────────────────┐
│  UI (React Query)    │   │  Agent (LLM)                                 │
│                      │   │                                              │
│  Calls /categories   │   │  Receives pre-filtered items and findings    │
│  once and caches it. │   │  with category already populated.            │
│  Each tab calls its  │   │  Uses the skill content to format a          │
│  own route, then     │   │  four-section response (Status / Summary /   │
│  joins with the      │   │  Findings by dimension+category /            │
│  cached categories   │   │  Suggested Actions)                          │
│  to group items into │   │                                              │
│  accordions          │   │                                              │
└──────────────────────┘   └──────────────────────────────────────────────┘
```

**Why categories live at the edges, not in the orchestrators:**
- Routes are lean — the UI already has categories cached via React Query, so re-fetching in the route adds cost with no benefit.
- Agent tools fetch categories in `Promise.all` alongside dimension data — no added latency.
- Orchestrators stay focused on one job: fetch and shape a single dimension's raw data.

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
server/lib/siem_readiness/fetchers/fetch_pipelines.ts   (raw ES I/O, no filtering)
    ↓
server/lib/siem_readiness/dimensions/get_continuity.ts  (filters to categorized, enriches with categories[], computes status → ContinuityPayload)
    ↓
server/lib/siem_readiness/routes/get_readiness_pipelines.ts  →  public/siem_readiness/ (UI)
    AND
server/agent_builder/tools/siem_readiness/get_continuity_tool.ts  →  agent
```

Both the route and the agent tool call the **same orchestrator**. The UI and agent always receive identical data.

The same pattern applies to all four dimensions: **Coverage**, **Quality**, **Continuity**, **Retention**.

### Layer responsibilities

**`src/types.ts`** — The source of truth for all shared types: `PipelineStats`, `CoveragePayload`, `QualityPayload`, `ContinuityPayload`, `RetentionPayload`, `ActionableFinding`. A new metric starts as a type change here.

**`src/constants.ts`** — Thresholds and category definitions: `CRITICAL_FAILURE_RATE_THRESHOLD`, `CATEGORY_ORDER`, API path constants.

**`src/get_siem_readiness_statuses/`** — Pure status functions (no I/O). Both the UI hooks and the server-side dimension orchestrators import from here — same logic, both surfaces.

**`fetchers/`** — Raw ES I/O, one file per query. No filtering, no verdict logic. Always return everything ES returns.

**`dimensions/`** — Per-dimension orchestrators. Call fetchers, compute status and `actionableFindings` from the raw data, and return `*Payload` objects. Items are unfiltered — all results are included regardless of category. No `fetchCategories` call here (except in `get_coverage`, which IS the categories data).

**`routes/`** — Thin HTTP wrappers (~20 lines) that call the matching dimension orchestrator and return the payload over HTTP. No filtering. The UI handles category grouping client-side using its cached categories response.

**Agent tools** — Call dimension orchestrators AND `fetchCategories` in parallel. Filter items to categorized-only and enrich `actionableFindings` with category before returning to the agent. New fields in a payload flow through automatically once added to the orchestrator.

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
