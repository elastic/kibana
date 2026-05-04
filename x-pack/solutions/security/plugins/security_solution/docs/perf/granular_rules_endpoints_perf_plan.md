# Performance test plan: granular rules endpoints

**Status**: `draft`. <!-- `draft` | `in progress` | `complete` -->
**Owner**: Detection Engine — Rule Management
**Branch under test**: `prebuilt-rules-install-review-kql`
**Baseline**: `upstream/main`

## Table of contents

- [Performance test plan: granular rules endpoints](#performance-test-plan-granular-rules-endpoints)
  - [Table of contents](#table-of-contents)
  - [Summary](#summary)
  - [Tickets](#tickets)
  - [Endpoints under test](#endpoints-under-test)
  - [Motivation](#motivation)
    - [What changed in the branch](#what-changed-in-the-branch)
    - [Risk hot spots we want to quantify](#risk-hot-spots-we-want-to-quantify)
  - [Methodology](#methodology)
    - [Deployments](#deployments)
    - [Data scenario](#data-scenario)
    - [Workload shape](#workload-shape)
    - [What we measure](#what-we-measure)
    - [Acceptance gates](#acceptance-gates)
  - [Scenarios](#scenarios)
    - [`POST /internal/detection_engine/rules/_search` (branch) / `GET /api/detection_engine/rules/_find` (main)](#post-internaldetection_enginerules_search-branch--get-apidetection_enginerules_find-main)
    - [`POST /internal/detection_engine/prebuilt_rules/installation/_review`](#post-internaldetection_engineprebuilt_rulesinstallation_review)
    - [`POST /internal/detection_engine/prebuilt_rules/upgrade/_review`](#post-internaldetection_engineprebuilt_rulesupgrade_review)
  - [Tooling](#tooling)
    - [Why k6](#why-k6)
    - [Script layout](#script-layout)
    - [Portability and extensibility goals](#portability-and-extensibility-goals)
  - [How to run](#how-to-run)
  - [Results](#results)
    - [Run windows](#run-windows)
    - [Data scenario](#data-scenario-1)
    - [Latency](#latency)
      - [Base case — main vs branch (latency)](#base-case--main-vs-branch-latency)
      - [Large page — main vs branch (latency)](#large-page--main-vs-branch-latency)
      - [Aggregates overhead — branch only (latency)](#aggregates-overhead--branch-only-latency)
      - [Fields restriction — branch only (latency)](#fields-restriction--branch-only-latency)
    - [Memory & payload](#memory--payload)
      - [Base case — main vs branch (memory & payload)](#base-case--main-vs-branch-memory--payload)
      - [Large page — main vs branch (memory & payload)](#large-page--main-vs-branch-memory--payload)
      - [Aggregates overhead — branch only (memory & payload)](#aggregates-overhead--branch-only-memory--payload)
      - [Fields restriction — branch only (memory & payload)](#fields-restriction--branch-only-memory--payload)
    - [APM cross-reference](#apm-cross-reference)
    - [Observations](#observations)
    - [Follow-ups](#follow-ups)
  - [Out of scope](#out-of-scope)

## Summary

The branch `prebuilt-rules-install-review-kql` adds (or extends) three rule-management endpoints to support a structured KQL `filter`, free-text `search`, server-side `sort`, a `fields` projection, and per-category facet `aggregations.counts`. Two of the three endpoints (`installation/_review` and `upgrade/_review`) already existed but received substantial rework; the third (`_search`) already exists on `main` and only sees a small contract tweak on the branch.

The motivation for this plan is to quantify the runtime cost of these changes against `upstream/main` on minimal Cloud deployments before we expand UI usage to request facet aggregations on every page load — and to document the savings the new `fields` projection unlocks for the rules table.

## Tickets

<!-- TODO: fill in -->

- Epic: <link>
- PR: <link>

## Endpoints under test

| # | Branch route                                                        | Main route                                            | Status on branch                |
| - | ------------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------- |
| 1 | `POST /internal/detection_engine/rules/_search`                     | `GET /api/detection_engine/rules/_find` (legacy)      | New route on the branch         |
| 2 | `POST /internal/detection_engine/prebuilt_rules/installation/_review` | same                                                | Substantial rework (KQL + aggs) |
| 3 | `POST /internal/detection_engine/prebuilt_rules/upgrade/_review`      | same (sort shape differs)                           | Substantial rework (KQL + aggs) |

For endpoint 1, the new POST `_search` route doesn't exist on `main`; the rules table on `main` still uses the legacy GET `_find`. We therefore benchmark `_find` on `main` and `_search` on `branch` for that scenario — same logical paginated payload, same projection options, just the route swap. That keeps the cross-deployment comparison apples-to-apples on what the UI is actually doing on each deployment.

The UI today calls all three endpoints without `aggregations.counts` and without `fields` (verified in `rules_table_context.tsx` for `_search`, `add_prebuilt_rules_table_context.tsx` for installation review, and `use_prebuilt_rules_upgrade.tsx` for upgrade review). The "with aggregates" and "fields restricted" scenarios therefore isolate the cost of the new code paths the UI is expected to start sending.

## Motivation

### What changed in the branch

- `_search` ([`server/lib/detection_engine/rule_management/api/rules/search_rules/route.ts`](../../server/lib/detection_engine/rule_management/api/rules/search_rules/route.ts)) — already on `main`. The branch adjusts the `filter` shape (`{term, mode}`) and shares the `buildAggregations` / `expandRawAggregationResult` helpers that drive aggregation parsing.
- `installation/_review` ([`review_rule_installation_handler.ts`](../../server/lib/detection_engine/prebuilt_rules/api/review_rule_installation/review_rule_installation_handler.ts)) — adds KQL `filter`, free-text `search`, multi-field `sort`, `fields` projection, and `aggregations.counts` (categories: `tags`, `severity`) computed over the full filtered installable set via a new `buildPrebuiltRuleInstallationAggregations` helper, with a chunking pass added in commit `9d920bac` to dodge the Elasticsearch boolean clause limit.
- `upgrade/_review` ([`review_rule_upgrade_handler.ts`](../../server/lib/detection_engine/prebuilt_rules/api/review_rule_upgrade/review_rule_upgrade_handler.ts)) — adds the same `filter` / `search` / `sort` / `fields` surface plus `aggregations.counts` (categories: `tags`, `enabled`, `updatedBy`, `createdBy`, `lastRunOutcome`, `isCustomized`, `type`). When aggregates are requested, the handler runs `fetchGranularFacetCountsChunked` ([`granular_facet_aggregations.ts`](../../server/lib/detection_engine/rule_management/logic/search/granular_facet_aggregations.ts)) which issues one extra aggs-only `findRules` call per 1024-id chunk over the full upgradeable set.

### Risk hot spots we want to quantify

1. **Extra ES round-trips on `upgrade/_review`** when `aggregations.counts` is requested — at typical scale (default prebuilt-rules package, ~1k–2k rules, of which a subset are upgradeable) this is one or two extra calls, but the per-call overhead and serialization of the merged terms buckets is what we want to measure.
2. **Aggregation cost on `installation/_review`** — the terms aggregation runs over the filtered installable rule-asset set (potentially many hundreds of documents). The chunking added in `9d920bac` keeps the OR-clause expansion bounded but adds round-trips proportional to the chunk count.
3. **KQL parse + filter expansion** on every request to all three endpoints — small per-call cost, but worth tracking against `main` to make sure the new structured-filter shape doesn't introduce regressions on the no-aggregates path the UI uses today.
4. **Payload size when `fields` is omitted** — a baseline for how much bandwidth the `fields` projection saves once the UI starts sending it.

## Methodology

### Deployments

- Two minimal ESS Cloud deployments, identical instance size:
  - `main` — built from a snapshot of `upstream/main` at time of run.
  - `branch` — built from a snapshot of `prebuilt-rules-install-review-kql` HEAD at time of run.
- Single Kibana node, single Elasticsearch node. No additional plugins enabled beyond defaults.
- Both deployments must be empty of custom rules, and must have completed background installation of the default `security_detection_rules` package before the run starts (the script will probe for this and fail fast otherwise).

Record for each deployment in the [Results](#results) section: deployment ID, ESS region, Kibana version, Elastic stack version, instance size, and the `security_detection_rules` package version installed.

### Data scenario

The default prebuilt-rules package alone leaves two of the three benched endpoints (`_search` and `upgrade/_review`) running against empty result sets, which makes the latency numbers honest but the bytes/req comparisons meaningless and never exercises the chunked-aggs path on `upgrade/_review`. So before each cross-deployment run we seed both deployments with a fixed fixture using [`seed.mjs`](../../scripts/perf/granular_rules_endpoints/seed.mjs):

- **2000 custom query rules** tagged `perf-bench:search`. Disabled (never fire), minimal body (`{type:"query", index:["logs-*"], query:"*", risk_score:21, severity:"low"}`). They give the rules table something real to page, sort, and filter over for the `_search` / `_find` benches.
- **All prebuilt rules installed at an older `security_detection_engine` package version, with the latest package version layered on top.** Mechanism: (1) delete every immutable detection rule, (2) install `security_detection_engine@<old>` via Fleet (`force: true`) so rule_assets reflects the older catalog, (3) install all prebuilt rules — they land at the older versions, (4) install `security_detection_engine@<latest>` via Fleet so rule_assets refreshes to the latest catalog without touching the alert SOs we just installed. The result is `installed.version < asset.version` for every prebuilt rule, which is exactly the state `upgrade/_review` is built to detect, and the chunked-aggs path runs across multiple 1024-id chunks. The older version defaults to the immediately-previous version published in the [Elastic Package Registry](https://epr.elastic.co); pass `--older-version V` to override.

We use the package-downgrade path instead of mutating `alert.params.version` directly because Kibana's system indices (`.kibana_alerting_cases*`) reject writes from the dev console proxy on Cloud — `_update_by_query` reported `total: 0` even with `x-elastic-product-origin: kibana` set. The Fleet install path doesn't have that restriction; it writes through `kibana_system`'s own credentials.

`custom-rules` is idempotent (tops up to 2000 if some were deleted). `upgradeable-rules` deletes and reinstalls the prebuilt rule set from scratch each time — the only safe way to reset versions without leaving the deployment in a half-state. `seed.mjs cleanup` deletes every `perf-bench:*`-tagged rule and runs `upgrade/_perform { mode: ALL_RULES, pick_version: TARGET }` to bring prebuilt rules back to their current asset versions.

What each endpoint then exercises:

- `_search` / `_find` — runs against the alerting SO index over (prebuilt + custom) installed rules. With the seed in place that's `~1.5k–2k prebuilt + 2000 custom = ~3500–4000` rules — well above the `per_page=20` UI default and effectively unpaged at the `large_page` ceiling of 5000.
- `installation/_review` — exercises the package's installable rule assets (the package versions that are not already installed on the deployment). The seed installs every prebuilt rule from the package, which drops the installable set to 0; install/_review against a seeded deployment therefore returns an empty page and is not a meaningful measurement. We capture install/_review numbers separately on a fresh / unseeded deployment, promote those summaries into [`scripts/perf/granular_rules_endpoints/baseline/`](../../scripts/perf/granular_rules_endpoints/baseline/), and skip the install/_review benches in the default `run_all.sh` matrix. `build_report.mjs` folds the baseline summaries into `results.html` automatically, tags the affected rows _(baseline)_, and shows distinct rows in the **Run windows** table so the APM cross-reference window for the install/_review baseline stays separate from this run's window. The baseline can be refreshed when the install/_review handler changes by running `INCLUDE_INSTALLATION_REVIEW=1 ./run_all.sh` against an unseeded deployment (see "Baseline benches" in the perf-suite README).
- `upgrade/_review` — exercises the upgradeable subset, which after seeding is essentially the entire prebuilt-rules set (minus any rules already at version 1).

The bench script captures `total` from the first warmup response of each run and persists it in the per-bench summary JSON; `build_report.mjs` renders a "Data scenario" section near the top of `results.html` so the report makes the fixture state explicit. If those numbers come back trivially small for a deployment, the seed didn't take — the bench can still be re-run without re-running the benches against the other deployment.

The script's scenario module is structured so additional fixtures (e.g. a "heavy" scenario with synthetic alerts to age the alerting index, or fixtures for custom-rule sort/filter shapes) can be added later as new seed subcommands without modifying the runner.

### Workload shape

Per (endpoint × variant), one k6 invocation:

- One session login via the `basic` provider, before warm-up (not measured).
- A brief settle (3 s) before warm-up so prior load on the shared deployment doesn't leak in.
- 5 warm-up iterations (results discarded). Warm-up matters for prebuilt-rules code paths in particular because asset clients lazily populate caches.
- One `/api/status` poll right after warm-up — the **baseline** heap/RSS sample, taken when caches are primed and one-off allocations are done.
- 100 measured sequential iterations at concurrency 1, mirroring the UI usage pattern (one user, one page at a time).
- During the measured loop, one `/api/status` poll every 10 iterations (10 during-bench memory samples per bench) appended to a k6 Trend so we can summarise heap/RSS as a min/mean/max distribution rather than a single post-pre delta.
- Same iteration count and sampling cadence across both deployments so the comparison is apples-to-apples.

Within a deployment the k6 invocations run sequentially so per-bench memory pressure reflects that bench's load. Across deployments they run in parallel because the deployments share no resources. The matrix on the branch deployment is the full 12 cells (3 endpoints × 4 variants); the main deployment runs only the 6 cross-deployment cells (`base` and `large_page` for each endpoint), since `aggregates` and `fields_restricted` exercise code paths that don't exist on `main`.

### What we measure

- **In the script** (per request): latency (`http_req_duration`) and response payload bytes (`http_req_receiving` + body length). HTTP non-200s fail the run.
- **In the script** (per bench): heap and RSS *growth above baseline* from `/api/status` polls. One baseline poll right after warm-up, then 10 during-bench polls evenly spaced across the measured loop, summarised into k6 Trend stats (min / mean / median / max / p95). The headline metric in the report is `mean(during-bench samples) − baseline`. This replaces the older two-point post − pre delta, which on short benches was dominated by single-GC-event timing and frequently went negative for reasons unrelated to the bench. Still a coarse signal — useful for spotting obvious leak or growth patterns but not a substitute for the sustained-behaviour APM view.
- **Out of band** (per run): sustained resource consumption — Kibana heap/RSS over time, GC pauses, ES-side load, request traces — is collected by the existing APM tracing on the separate APM cluster. We capture each run's start/end timestamps from the `Run windows` section of the report and use that as the cross-reference window in APM.

### Acceptance gates

These are the gates the run must clear before we declare the branch ready to merge. Numbers are placeholders to tune after the first dry-run.

- Branch base-case p95 latency within **+10%** of main base-case p95 for every endpoint.
- Branch large-page p95 latency within **+15%** of main large-page p95 for every endpoint (slightly looser than base because absolute latencies are higher and noisier at the larger page size).
- Branch aggregates-case overhead (vs branch base case) documented for every endpoint, with no p95 above **2× the branch base case** at default-package scale.
- Branch fields-restricted case yields a measurable bytes/req reduction vs branch `large_page` (per_page-matched comparison; target: at least **30%** smaller per-request payload on `_search` and the two `_review` endpoints) and no latency regression (p95 within **±5%** of branch `large_page`).
- Branch `Heap growth, mean` and `RSS growth, mean` per bench within **+25%** of the corresponding `main` bench for every cross-deployment endpoint+variant, and no positive outlier larger than **64 MB** absolute on any bench. (Negative growth values — bench ran with less heap pressure than the post-warmup baseline — are acceptable and usually indicate GC ran during the measured window.)
- APM cross-check: no sustained heap or GC regression on the branch deployment relative to the main deployment over the run window. Documented in [Observations](#observations).
- No 4xx/5xx responses across the run.

## Scenarios

For each endpoint we run four variants:

- **base** — what the UI sends today (no `aggregations.counts`, no `fields`, `per_page=20`). Cross-deployment.
- **large_page** — same shape as `base` but with `per_page` raised well above the UI default: `5000` on `_search` / `_find` (effectively unpaged for the seeded ~3.5–4k rule fixture; held under the 10000 schema cap to dodge `_search`'s cursor-less search_after edge case at exactly `MAX_RESULTS_WINDOW` and the unprojected response-size rejection on Cloud) and `500` on the two `_review` endpoints (their schema-imposed cap, 25× the UI default). Cross-deployment. Stresses serialization, network transfer, and ES `size:` overhead well beyond the 20-row UI default.
- **aggregates** — same body as `base` plus `aggregations.counts` filled in for every supported facet category. Branch only. Stays at `per_page=20` because aggregations run over the full filtered set regardless of page size — the cost is independent of `per_page`, so the realistic UI workload is the right baseline.
- **fields_restricted** — same `per_page` as `large_page` plus a narrow `fields` projection (the realistic minimum the UI tables render). Branch only. Run at the schema-cap `per_page` because the bytes-saved effect of `fields` is what we're measuring and that effect only really materialises at scale. Compared in the report against branch `large_page` (not `base`) so the per_page is matched and the delta isolates the projection effect rather than conflating it with the page-size jump.

### `POST /internal/detection_engine/rules/_search` (branch) / `GET /api/detection_engine/rules/_find` (main)

Branch base body (matches `findRulesQueryArgs` in [`rules_table_context.tsx`](../../public/detection_engine/rule_management_ui/components/rules_table/rules_table/rules_table_context.tsx) with default sort and pagination):

```json
{
  "page": 1,
  "per_page": 20,
  "sort_field": "name",
  "sort_order": "asc"
}
```

Main base case — same fields, sent as URL query parameters to the legacy `_find` route:

```http
GET /api/detection_engine/rules/_find?page=1&per_page=20&sort_field=name&sort_order=asc
```

Large-page variant bumps `per_page` to `5000` on both routes (well above the 20-row UI default and effectively unpaged for the seeded ~3.5–4k rule fixture; held below the 10000 schema cap to dodge `_search`'s cursor-less search_after edge case and the unprojected response-size rejection on Cloud — see `SEARCH_LARGE_PAGE` in `scenarios.js`). The other two variants (`aggregates`, `fields_restricted`) only target the new branch route.

Aggregates body — adds every category from `GranularRulesFacetCategory`:

```json
{
  "page": 1,
  "per_page": 20,
  "sort_field": "name",
  "sort_order": "asc",
  "aggregations": {
    "counts": [
      "tags",
      "enabled",
      "updatedBy",
      "createdBy",
      "lastRunOutcome",
      "isCustomized",
      "type"
    ]
  }
}
```

Fields-restricted body — narrow projection from the `SearchRulesField` enum (camelCase). Same `per_page` as the large-page variant so the comparison isolates the projection effect rather than conflating it with the page-size jump:

```json
{
  "page": 1,
  "per_page": 5000,
  "sort_field": "name",
  "sort_order": "asc",
  "fields": ["id", "name", "tags", "enabled"]
}
```

### `POST /internal/detection_engine/prebuilt_rules/installation/_review`

Base body (matches `usePrebuiltRulesInstallReview` caller in [`add_prebuilt_rules_table_context.tsx`](../../public/detection_engine/rule_management_ui/components/rules_table/add_prebuilt_rules_table/add_prebuilt_rules_table_context.tsx) with default sort):

```json
{
  "page": 1,
  "per_page": 20,
  "sort": [{ "field": "name", "order": "asc" }]
}
```

Aggregates body — adds every category from `PrebuiltRuleAssetsFacetCategory`:

```json
{
  "page": 1,
  "per_page": 20,
  "sort": [{ "field": "name", "order": "asc" }],
  "aggregations": {
    "counts": ["tags", "severity"]
  }
}
```

Fields-restricted body — narrow projection from the `ReviewRuleInstallationField` enum (snake_case). `per_page` matches the large-page variant (the route's schema cap) so the comparison isolates the projection effect:

```json
{
  "page": 1,
  "per_page": 500,
  "sort": [{ "field": "name", "order": "asc" }],
  "fields": ["name", "severity", "risk_score", "tags"]
}
```

### `POST /internal/detection_engine/prebuilt_rules/upgrade/_review`

Base body (matches `usePrebuiltRulesUpgradeReview` caller in [`use_prebuilt_rules_upgrade.tsx`](../../public/detection_engine/rule_management/hooks/use_prebuilt_rules_upgrade.tsx) with default sort):

```json
{
  "page": 1,
  "per_page": 20,
  "sort": [{ "field": "name", "order": "asc" }]
}
```

Aggregates body — adds every category from `GranularRulesFacetCategory`:

```json
{
  "page": 1,
  "per_page": 20,
  "sort": [{ "field": "name", "order": "asc" }],
  "aggregations": {
    "counts": [
      "tags",
      "enabled",
      "updatedBy",
      "createdBy",
      "lastRunOutcome",
      "isCustomized",
      "type"
    ]
  }
}
```

Fields-restricted body — narrow projection from the upgrade-review fields enum (snake_case). `per_page` matches the large-page variant (the route's schema cap) so the comparison isolates the projection effect:

```json
{
  "page": 1,
  "per_page": 500,
  "sort": [{ "field": "name", "order": "asc" }],
  "fields": ["name", "severity", "risk_score", "tags"]
}
```

## Tooling

### Why k6

- We need a real HTTP benchmark, not a JS micro-benchmark — the cost we care about is end-to-end through the route handler, the alerting client, and Elasticsearch, against a live deployment.
- k6 gives us a small, ergonomic JS API that runs against any reachable Kibana, with built-in latency Trends and counters that map cleanly onto the metrics we want.
- It has a stable JSON `handleSummary` extension point we use to hand a structured payload off to `build_report.mjs` instead of scraping stdout.

### Script layout

```text
scripts/perf/granular_rules_endpoints/
├── README.md                  # how to run / output contract
├── .eslintrc.js               # local overrides for k6 / CLI conventions
├── run_all.sh                 # orchestrates main + branch in parallel, then build_report.mjs
├── build_report.mjs           # aggregates summary JSONs into a single markdown report
├── bench.js                   # single parameterized k6 entrypoint (SCENARIO + VARIANT env)
├── config.js                  # env vars + workload knobs
├── scenarios.js               # all 3 scenarios + variant bodies + per-deployment overrides
├── seed.mjs                   # Node CLI: seed the data fixture each deployment needs
├── baseline/                  # promoted summaries for benches that can't share the seeded state
└── lib/
    ├── http.js                # k6 http wrappers (login, GET, POST), shared headers
    ├── latency.js             # k6 metric pre-registration + per-request recorder
    ├── memory.js              # /api/status sampler + baseline gauge + during-bench trend
    ├── summary.js             # JSON summary payload + stdout one-liner
    ├── run_scenario.js        # per-invocation lifecycle (login, warm-up, measure, sample)
    └── seed_lib.mjs           # Node fetch helpers used by seed.mjs (login, request)
```

### Portability and extensibility goals

The folder is self-contained: no `@kbn/*` imports, no relative paths into Kibana source, no Node deps beyond what k6 and Node 20 ship with. Adding a new endpoint is a new entry in `scenarios.js` plus the matching `(scenario, variant)` pairs in `run_all.sh`'s matrix arrays — `bench.js` is fully parameterized and `build_report.mjs` indexes summaries by `label__scenario__variant` so neither needs changes. See the README's "Adding a new endpoint scenario" section for the full recipe.

## How to run

Prerequisites:

- k6 installed locally (`brew install k6` on macOS).
- Node 20+ for `seed.mjs` and `build_report.mjs`.
- Two ESS Cloud deployments. A username + password for each (the default ESS `elastic` superuser works) — each k6 invocation logs in once via the `basic` provider so the request realm matches the browser.

Step 1 — seed each deployment's data fixture (one-time per deployment, idempotent on re-runs):

```bash
cd x-pack/solutions/security/plugins/security_solution/scripts/perf/granular_rules_endpoints

K6_KIBANA_BASE_URL="$MAIN_URL"   K6_KIBANA_USERNAME="$MAIN_USERNAME"   K6_KIBANA_PASSWORD="$MAIN_PASSWORD"   LABEL=main   node seed.mjs all
K6_KIBANA_BASE_URL="$BRANCH_URL" K6_KIBANA_USERNAME="$BRANCH_USERNAME" K6_KIBANA_PASSWORD="$BRANCH_PASSWORD" LABEL=branch node seed.mjs all
```

`seed.mjs all` creates 2000 disabled custom query rules tagged `perf-bench:search` and reinstalls every prebuilt rule at an older `security_detection_engine` package version (then puts the latest package back) so `upgrade/_review` reports them as upgradeable. See the README's "Seeding the data fixture" for subcommands and rationale. Use `seed.mjs cleanup` to remove the fixture when you're done with a deployment.

Step 2 — run the bench. `run_all.sh` runs the default matrix (`_search` / `_find` and `upgrade/_review`) against both deployments (deployments in parallel, benches sequential within a deployment), folds in the preserved `installation/_review` summaries from `baseline/`, and aggregates everything into a single `results.html` (paste-into-Google-Docs format with embedded CSS):

```bash
MAIN_URL=https://<main-deployment>.es.io:9243 \
MAIN_USERNAME=elastic \
MAIN_PASSWORD=<main-password> \
BRANCH_URL=https://<branch-deployment>.es.io:9243 \
BRANCH_USERNAME=elastic \
BRANCH_PASSWORD=<branch-password> \
  ./run_all.sh
```

For one-off iteration on a single (endpoint × variant), invoke the bench script directly — see the README's "Running a single scenario" section for the env-var contract. To refresh the `installation/_review` baseline, run with `INCLUDE_INSTALLATION_REVIEW=1` against an unseeded deployment — see "Refreshing the install/_review baseline" in the perf-suite README.

The aggregated `results.html` is what gets pasted into the [Results](#results) section below (or copied straight into a Google Doc — the embedded CSS round-trips through the paste). The **Headlines** block at the top is hand-edited via [`headlines.html`](../../scripts/perf/granular_rules_endpoints/headlines.html); the **Test parameters** table records the static fixture / workload values; the **Run windows** table doubles as the APM cross-reference window (with separate rows for `this run` and `baseline` so each window points at one well-defined time range); the **Data scenario** table makes the dynamic fixture state visible (any trivially small total there indicates the seed didn't take on that deployment; rows tagged _(baseline)_ come from the preserved `baseline/` summaries).

## Results

> Numbers below are placeholders. Replace after running.

Run metadata:

| Field                        | main | branch |
| ---------------------------- | ---- | ------ |
| Deployment ID                |      |        |
| ESS region                   |      |        |
| Kibana version               |      |        |
| Stack version                |      |        |
| Instance size                |      |        |
| Prebuilt rules package       |      |        |
| Run timestamp (UTC)          |      |        |
| Total iterations / bench     |      |        |

### Run windows

Pasted from `build_report.mjs` output — also used as the [APM cross-reference](#apm-cross-reference) window.

| Deployment | First sample (UTC) | Last sample (UTC) |
| ---------- | ------------------ | ----------------- |
| `main`     |                    |                   |
| `branch`   |                    |                   |

### Data scenario

`total` parsed from the first warmup response of each bench. Confirms the seeding fixture took on each deployment — trivially small numbers here mean the corresponding `seed.mjs` step didn't run or didn't succeed.

| Endpoint               | `main` | `branch` |
| ---------------------- | -----: | -------: |
| `_search` / `_find`    |        |          |
| `installation/_review` |        |          |
| `upgrade/_review`      |        |          |

### Latency

p50 / p95 of `http_req_duration` over 100 measured iterations per bench. Δ column shows the right column relative to the left, signed so a regression on the right reads as positive. p99 over 100 samples is a single observation and swings run-to-run, so it is omitted from the rendered tables but kept in each `out/*.summary.json`; mean is also in each summary file.

#### Base case — main vs branch (latency)

No `aggregations.counts`, no `fields` restriction, default `per_page=20` — what the UI sends today. For `search_rules`, `main` hits the legacy GET `_find` route while `branch` hits the new POST `_search`; payloads are equivalent.

| Endpoint               | Percentile | main | branch | Δ |
| ---------------------- | ---------- | ---: | -----: | -: |
| `_search` / `_find`    | p50 (ms)   |      |        |   |
| `_search` / `_find`    | p95 (ms)   |      |        |   |
| `installation/_review` | p50 (ms)   |      |        |   |
| `installation/_review` | p95 (ms)   |      |        |   |
| `upgrade/_review`      | p50 (ms)   |      |        |   |
| `upgrade/_review`      | p95 (ms)   |      |        |   |

#### Large page — main vs branch (latency)

Same shape as base, but `per_page` raised well above the UI default — `5000` on `_search` / `_find` (effectively unpaged for the seeded ~3.5–4k rule fixture; held under the 10000 schema cap to dodge `_search`'s cursor-less search_after edge case and the unprojected response-size rejection on Cloud) and `500` on the two `_review` endpoints (their schema cap, 25× the UI default). Tests serialization, network transfer, and ES `size:` overhead well beyond the 20-row UI default.

| Endpoint               | Percentile | main | branch | Δ |
| ---------------------- | ---------- | ---: | -----: | -: |
| `_search` / `_find`    | p50 (ms)   |      |        |   |
| `_search` / `_find`    | p95 (ms)   |      |        |   |
| `installation/_review` | p50 (ms)   |      |        |   |
| `installation/_review` | p95 (ms)   |      |        |   |
| `upgrade/_review`      | p50 (ms)   |      |        |   |
| `upgrade/_review`      | p95 (ms)   |      |        |   |

#### Aggregates overhead — branch only (latency)

`aggregates` vs `base` on the branch deployment. Compared against `base` (not `large_page`) because `aggregations.counts` runs over the full filtered set regardless of page size — the cost is independent of `per_page`.

| Endpoint               | Percentile | base | aggregates | Δ |
| ---------------------- | ---------- | ---: | ---------: | -: |
| `_search` / `_find`    | p50 (ms)   |      |            |   |
| `_search` / `_find`    | p95 (ms)   |      |            |   |
| `installation/_review` | p50 (ms)   |      |            |   |
| `installation/_review` | p95 (ms)   |      |            |   |
| `upgrade/_review`      | p50 (ms)   |      |            |   |
| `upgrade/_review`      | p95 (ms)   |      |            |   |

#### Fields restriction — branch only (latency)

`fields_restricted` vs `large_page` on the branch deployment. Both runs use the same `per_page` so the comparison isolates the projection effect rather than conflating it with the page-size jump. Latency should be roughly flat or slightly better; the bytes/req win is in the [Memory & payload section](#fields-restriction--branch-only-memory--payload).

| Endpoint               | Percentile | large_page | fields_restricted | Δ |
| ---------------------- | ---------- | ---------: | ----------------: | -: |
| `_search` / `_find`    | p50 (ms)   |            |                   |   |
| `_search` / `_find`    | p95 (ms)   |            |                   |   |
| `installation/_review` | p50 (ms)   |            |                   |   |
| `installation/_review` | p95 (ms)   |            |                   |   |
| `upgrade/_review`      | p50 (ms)   |            |                   |   |
| `upgrade/_review`      | p95 (ms)   |            |                   |   |

### Memory & payload

Per-request response payload size and per-bench Kibana process memory pressure during the measured loop. `Heap growth, mean (MB)` and `RSS growth, mean (MB)` are computed as `mean(during-bench /api/status samples) − baseline`, where the baseline is one `/api/status` poll taken right after warm-up completes and the during-bench samples are taken every 10 iterations of the measured loop (10 samples per bench at `measuredCount=100`). This replaces an older two-point post − pre delta that was dominated by GC timing and frequently went negative on short benches. Δ for `bytes/req` is a percentage; Δ for the growth rows is the signed absolute MB difference between deployments. Negative growth is still possible (it means the bench ran with less heap pressure than the post-warmup baseline, e.g. GC fired during the measured window) but is now rare. The [APM cross-reference](#apm-cross-reference) section remains the source of truth for sustained behaviour over the run window.

#### Base case — main vs branch (memory & payload)

No `aggregations.counts`, no `fields` restriction, default `per_page=20` — what the UI sends today.

| Endpoint               | Metric                  | main | branch | Δ |
| ---------------------- | ----------------------- | ---: | -----: | -: |
| `_search` / `_find`    | bytes/req (KB)          |      |        |   |
| `_search` / `_find`    | Heap growth, mean (MB)  |      |        |   |
| `_search` / `_find`    | RSS growth, mean (MB)   |      |        |   |
| `installation/_review` | bytes/req (KB)          |      |        |   |
| `installation/_review` | Heap growth, mean (MB)  |      |        |   |
| `installation/_review` | RSS growth, mean (MB)   |      |        |   |
| `upgrade/_review`      | bytes/req (KB)          |      |        |   |
| `upgrade/_review`      | Heap growth, mean (MB)  |      |        |   |
| `upgrade/_review`      | RSS growth, mean (MB)   |      |        |   |

#### Large page — main vs branch (memory & payload)

Same shape as base, with the schema-cap `per_page` per route. Stresses serialization and process memory at scale.

| Endpoint               | Metric                  | main | branch | Δ |
| ---------------------- | ----------------------- | ---: | -----: | -: |
| `_search` / `_find`    | bytes/req (KB)          |      |        |   |
| `_search` / `_find`    | Heap growth, mean (MB)  |      |        |   |
| `_search` / `_find`    | RSS growth, mean (MB)   |      |        |   |
| `installation/_review` | bytes/req (KB)          |      |        |   |
| `installation/_review` | Heap growth, mean (MB)  |      |        |   |
| `installation/_review` | RSS growth, mean (MB)   |      |        |   |
| `upgrade/_review`      | bytes/req (KB)          |      |        |   |
| `upgrade/_review`      | Heap growth, mean (MB)  |      |        |   |
| `upgrade/_review`      | RSS growth, mean (MB)   |      |        |   |

#### Aggregates overhead — branch only (memory & payload)

`aggregates` vs `base` on the branch deployment. The `bytes/req` delta tells us how much the new `aggregations.counts` adds to each response.

| Endpoint               | Metric                  | base | aggregates | Δ |
| ---------------------- | ----------------------- | ---: | ---------: | -: |
| `_search` / `_find`    | bytes/req (KB)          |      |            |   |
| `_search` / `_find`    | Heap growth, mean (MB)  |      |            |   |
| `_search` / `_find`    | RSS growth, mean (MB)   |      |            |   |
| `installation/_review` | bytes/req (KB)          |      |            |   |
| `installation/_review` | Heap growth, mean (MB)  |      |            |   |
| `installation/_review` | RSS growth, mean (MB)   |      |            |   |
| `upgrade/_review`      | bytes/req (KB)          |      |            |   |
| `upgrade/_review`      | Heap growth, mean (MB)  |      |            |   |
| `upgrade/_review`      | RSS growth, mean (MB)   |      |            |   |

#### Fields restriction — branch only (memory & payload)

`fields_restricted` vs `large_page` on the branch deployment. The `bytes/req` delta is the headline metric — it tells us what the projection saves on a per-request basis once the UI starts sending `fields`.

| Endpoint               | Metric                  | large_page | fields_restricted | Δ |
| ---------------------- | ----------------------- | ---------: | ----------------: | -: |
| `_search` / `_find`    | bytes/req (KB)          |            |                   |   |
| `_search` / `_find`    | Heap growth, mean (MB)  |            |                   |   |
| `_search` / `_find`    | RSS growth, mean (MB)   |            |                   |   |
| `installation/_review` | bytes/req (KB)          |            |                   |   |
| `installation/_review` | Heap growth, mean (MB)  |            |                   |   |
| `installation/_review` | RSS growth, mean (MB)   |            |                   |   |
| `upgrade/_review`      | bytes/req (KB)          |            |                   |   |
| `upgrade/_review`      | Heap growth, mean (MB)  |            |                   |   |
| `upgrade/_review`      | RSS growth, mean (MB)   |            |                   |   |

### APM cross-reference

Sustained resource consumption (Kibana heap/RSS over time, GC pauses, ES-side request latency and load) is tracked by the existing APM cluster. Use the `Run windows` table above as the time window when capturing dashboards / traces.

| Run     | Start (UTC) | End (UTC) | APM trace dashboard URL |
| ------- | ----------- | --------- | ----------------------- |
| `main`  |             |           |                         |
| `branch`|             |           |                         |

<!-- Paste links / screenshots of the APM service overview, transaction latency, and any heap/GC charts that cover the run windows. -->


### Observations

<!-- Notes on each endpoint, anything surprising, links to flame graphs / Cloud monitoring screenshots. -->

### Follow-ups

<!-- Issues opened, regressions to fix, deferred scenarios. -->

## Out of scope

- Concurrency stress (multi-VU, multi-page-load). Current goal is a single-user comparison; concurrency is a separate workload to plan once the contract is stable.
- Synthetic rule data beyond the default prebuilt package. A "heavy" scenario module is left as a follow-up — the runner is structured to accept it without code changes elsewhere.
- Network-level detail (DNS, TLS, request queueing). All recorded latencies are end-to-end from the k6 client; per-leg breakdowns belong to the APM trace cluster.
