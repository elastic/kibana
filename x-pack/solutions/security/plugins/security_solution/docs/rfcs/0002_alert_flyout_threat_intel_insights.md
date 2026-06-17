# 0002 — Alert Flyout Threat Intelligence Insights (P0)

|              |                                                                 |
| ------------ | --------------------------------------------------------------- |
| Status       | Draft — ready for implementation                                |
| Owner        | Threat Intelligence                                             |
| Updated      | 2026-05-17                                                      |
| Depends on   | [PR #269002](https://github.com/elastic/kibana/pull/269002) threat-intel skill, `ioc_indicator_sync`, `hit_provenance_backfill` |
| Out of scope | P1–P4 (indicator surfacing, coverage badge, proposed rules, subscriptions) — see §10 |

## 1. Summary

Add a single internal API — **`POST /internal/threat_intelligence/flyout_insights`** — that joins the current alert document to rows in `.kibana-threat-reports*` using the same Layer 1 / Layer 2 semantics as `hit_provenance_backfill.yaml`, but **in reverse** (alert → reports).

Expose the result in the document flyout **Threat intelligence** details panel as a **Related threat reports** subsection, gated on `threatIntelligenceSkillEnabled` and `threatIntelligence_read`.

This RFC covers **P0 only**: the aggregator route, shared types, service module, and flyout UI. It deliberately does **not** add a second CTI index query to the legacy investigation-time enrichment path.

## 2. Background

### 2.1 What the flyout does today

| Path | Mechanism | Data source |
| ---- | --------- | ----------- |
| Threat matches / enrichments counts | `useFetchThreatIntelligence` | `threat.enrichments` on the alert + CTI `eventEnrichment` search strategy |
| Investigation-time enrichment | `useInvestigationTimeEnrichment` | `uiSettings` threat indices (`DEFAULT_THREAT_INDEX_KEY`) — **not** `.kibana-threat-intel-indicators` |

“0 threat matches” on an alert that never fired an Indicator Match rule against the synced index is expected. P0 does not change that; it adds **report provenance** alongside the existing panel.

### 2.2 How reports link to alerts (PR #269002)

**Layer 1 — IOC / Indicator Match**

- `ioc_indicator_sync` writes `threat.indicator.reference = "threat-report:<report_id>"` on `.kibana-threat-intel-indicators`.
- Indicator Match alerts surface this on `kibana.alert.threat.indicator.reference` (and in `threat.enrichments`).

**Layer 2 — Behavioral / technique overlap**

- Reports carry `extracted.behaviors[].technique_id` (nested).
- `hit_provenance_backfill` counts alerts where `kibana.alert.rule.threat.technique.id` overlaps those techniques (excluding `threat_match` rule type).

**What `provenance.environment_hits` is *not***

The backfill stores **aggregate counts** per report (`layer_1_ioc_match`, `layer_2_behavioral`, `window`, `computed_at`). There is **no** `alert_id` array. Flyout joins must use indicator reference and/or technique overlap — not `environment_hits.alert_id`.

### 2.3 Architecture placement

Threat intelligence is **inside** `security_solution` (standalone plugin folded in). Extend:

- Server: `server/threat_intelligence/routes/` + `server/threat_intelligence/services/`
- Common: `common/threat_intelligence/hub/`
- Public flyout: `public/flyout_v2/document/tools/threat_intelligence/`

Do **not** introduce a new Kibana plugin or `optionalPlugins` contract.

## 3. API contract

### 3.1 Route

| Property | Value |
| -------- | ----- |
| Method / path | `POST /internal/threat_intelligence/flyout_insights` |
| Constant | `FLYOUT_INSIGHTS_API_PATH` in `common/threat_intelligence/hub/constants.ts` |
| Access | `internal` |
| Authz | `threatIntelligence_read` (`THREAT_INTELLIGENCE_API_PRIVILEGES.read`) |
| Version | `1` |

### 3.2 Request body

The browser sends normalized alert fields extracted from `DataTableRecord.flattened` (server does not re-fetch the alert doc in P0).

```ts
interface FlyoutInsightsRequest {
  /** Alert document `_id` — informational; not used for ES joins in P0 */
  alert_id: string;

  /** Rule type from `kibana.alert.rule.type` */
  rule_type?: string;

  /**
   * Layer 1 join key. First value if array.
   * Expected form: `threat-report:<report_id>`
   */
  indicator_reference?: string;

  /**
   * Layer 2 join keys from `kibana.alert.rule.threat.technique.id`
   * and `kibana.alert.rule.threat.technique.subtechnique.id` (deduped).
   */
  technique_ids?: string[];

  /**
   * Cap on technique-overlap reports returned. Default 10, max 25.
   */
  max_reports?: number;

  /**
   * Only return reports with `provenance.environment_hits_total > 0`.
   * Default false — overlap alone is enough to surface context.
   */
  require_environment_hits?: boolean;
}
```

**Kibana config-schema** (route validate): mirror the above; `alert_id` required; arrays optional; `max_reports` default 10, max 25.

### 3.3 Response body

```ts
type RelatedReportJoinReason = 'ioc_reference' | 'technique_overlap';

interface FlyoutInsightsRelatedReport {
  report_id: string;
  title: string;
  source: {
    type: string;
    name: string;
    url?: string;
  };
  severity: SeverityLevel;
  /** ISO-8601 — `provenance.extracted_at` or `@timestamp` fallback */
  extracted_at: string;
  techniques: string[];
  environment_hits_total: number;
  /** Why this report was returned */
  join_reason: RelatedReportJoinReason;
  /**
   * For `technique_overlap`: subset of request `technique_ids` that matched
   * `extracted.behaviors.technique_id` on this report.
   */
  matched_technique_ids?: string[];
}

interface FlyoutInsightsResponse {
  status: 'ok';
  layer_1_report_id?: string;
  related_reports: FlyoutInsightsRelatedReport[];
  meta: {
    layer_1_resolved: boolean;
    technique_overlap_count: number;
    reports_returned: number;
  };
}
```

**Ordering**

1. Layer 1 exact report (if resolved) — always first, `join_reason: 'ioc_reference'`.
2. Layer 2 technique overlap — sort by `environment_hits_total` desc, then `severity` desc, then `@timestamp` desc.
3. Deduplicate by `report_id` (Layer 1 wins if also matched via techniques).

**Empty response** is valid: `{ status: 'ok', related_reports: [], meta: { … } }`.

### 3.4 Error responses

| Code | When |
| ---- | ---- |
| 400 | Malformed body / invalid `indicator_reference` prefix |
| 403 | Missing `threatIntelligence_read` |
| 500 | ES failure (log + `customError` message, same pattern as `search_reports`) |

Feature flag is **not** checked server-side (routes already register only when `threatIntelligenceSkillEnabled` is on at plugin setup). UI hides the panel when the flag is off.

## 4. Service logic (`flyoutInsights`)

**Module:** `server/threat_intelligence/services/flyout_insights.ts`  
**Export from:** `server/threat_intelligence/services/index.ts`

### 4.1 Layer 1 — resolve report by indicator reference

```ts
const reportId = indicator_reference?.startsWith(INDICATOR_REFERENCE_PREFIX)
  ? indicator_reference.slice(INDICATOR_REFERENCE_PREFIX.length)
  : undefined;
```

If `reportId` is set:

```json
GET .kibana-threat-reports*/_doc/{reportId}
```

Filter: `buildSpaceFilterTerms(spaceId)`.

Map hit → `FlyoutInsightsRelatedReport` with `join_reason: 'ioc_reference'`.

If doc missing: set `meta.layer_1_resolved: false`; continue to Layer 2.

### 4.2 Layer 2 — technique overlap search

Skip when `technique_ids` is empty after dedupe.

```json
POST .kibana-threat-reports*/_search
{
  "size": max_reports,
  "query": {
    "bool": {
      "filter": [
        { "terms": { "space_id": ["<current>", "*"] } },
        { "nested": {
            "path": "extracted.behaviors",
            "query": { "terms": { "extracted.behaviors.technique_id": ["T1059", "..."] } }
        }}
      ],
      "must_not": [
        { "term": { "_id": "<layer_1_report_id>" } }
      ]
    }
  },
  "_source": [
    "content.title", "source", "severity", "provenance",
    "extracted.behaviors", "extracted.ttps.techniques", "@timestamp"
  ],
  "sort": [
    { "provenance.environment_hits_total": { "order": "desc", "missing": "_last" } },
    { "severity.score": { "order": "desc", "missing": "_last" } },
    { "@timestamp": { "order": "desc" } }
  ]
}
```

Optional filter when `require_environment_hits: true`:

```json
{ "range": { "provenance.environment_hits_total": { "gt": 0 } } }
```

For each hit, compute `matched_technique_ids` by intersecting request techniques with nested `extracted.behaviors.technique_id` values (and optionally `extracted.ttps.techniques` if behaviors empty).

### 4.3 Field mapping (report `_source` → response)

| Response field | ES source |
| -------------- | --------- |
| `title` | `content.title` |
| `source` | `source.type`, `source.name`, `source.url` |
| `severity` | `severity.level` |
| `extracted_at` | `provenance.extracted_at` ?? `@timestamp` |
| `techniques` | unique union of `extracted.ttps.techniques` + behavior `technique_id`s (cap display at 8) |
| `environment_hits_total` | `provenance.environment_hits_total` ?? 0 |

### 4.4 Performance / safety

- At most **2** ES calls per flyout open (get-by-id + search), both scoped to `.kibana-threat-reports*`.
- No scan of `.alerts-security.alerts-*` from the flyout API.
- `max_reports` hard-capped at 25.
- Use `ignore_unavailable: true` on search (pattern already used elsewhere in threat-intel services).

## 5. UI specification

### 5.1 Feature gating

Render **Related threat reports** only when **all** of:

- `experimentalFeatures.threatIntelligenceSkillEnabled`
- User has threat intelligence read (use existing license/capability check pattern from Intelligence Hub route, or attempt API and hide on 403)
- Document is an alert (`kibana.alert.rule.uuid` present) — same check as `useFetchThreatIntelligence`

### 5.2 Files to add / modify

| File | Action |
| ---- | ------ |
| `common/threat_intelligence/hub/constants.ts` | Add `FLYOUT_INSIGHTS_API_PATH` |
| `common/threat_intelligence/hub/flyout_insights_types.ts` | **New** — request/response interfaces |
| `common/threat_intelligence/hub/index.ts` | Export types + path |
| `server/threat_intelligence/services/flyout_insights.ts` | **New** — domain logic |
| `server/threat_intelligence/services/flyout_insights.test.ts` | **New** — unit tests (ES client mocked) |
| `server/threat_intelligence/services/index.ts` | Export `flyoutInsights` |
| `server/threat_intelligence/routes/flyout_insights.ts` | **New** — route registration |
| `server/threat_intelligence/routes/index.ts` | Register route |
| `public/flyout_v2/document/tools/threat_intelligence/hooks/use_flyout_insights.ts` | **New** — `useQuery` / `useEffect` + HTTP POST |
| `public/flyout_v2/document/tools/threat_intelligence/components/related_threat_reports_panel.tsx` | **New** — table UI |
| `public/flyout_v2/document/tools/threat_intelligence/components/related_threat_reports_panel.test.tsx` | **New** |
| `public/flyout_v2/document/tools/threat_intelligence/components/test_ids.ts` | Add test ids |
| `public/flyout_v2/document/tools/threat_intelligence/components/threat_intelligence_details_view.tsx` | Mount panel below enrichment sections |
| `public/flyout_v2/document/main/components/threat_intelligence_overview.tsx` | Optional: one-line summary “N related threat reports” when `related_reports.length > 0` |

### 5.3 Hook — alert field extraction

`useFlyoutInsights({ hit })`:

```ts
const indicatorReference = getFirstField(hit, 'kibana.alert.threat.indicator.reference');
const techniqueIds = uniq([
  ...asArray(hit.flattened['kibana.alert.rule.threat.technique.id']),
  ...asArray(hit.flattened['kibana.alert.rule.threat.technique.subtechnique.id']),
].filter(Boolean));
```

POST body via `core.http.post(FLYOUT_INSIGHTS_API_PATH, { body: JSON.stringify({ … }) })`.

Debounce / cache: key query by `alert_id + indicator_reference + technique_ids.join(',')`; refetch when `hit` changes.

### 5.4 Panel UI (`RelatedThreatReportsPanel`)

Placement: bottom of `ThreatIntelligenceDetailsView`, after existing `EnrichmentSection`s, separated by `EuiHorizontalRule`.

Columns (reuse styling from `report_table.tsx` / Intelligence Hub recent grid):

| Column | Content |
| ------ | ------- |
| Title | `EuiLink` → Intelligence Hub with report id in URL state (or external `source.url` if no in-app detail route yet) |
| Severity | `EuiBadge` (same color map as report table attachment) |
| Extracted | Relative time from `extracted_at` |
| Env. hits | Badge when `environment_hits_total > 0` |
| Match | `ioc_reference` / `technique_overlap` badge; for overlap show `matched_technique_ids` in tooltip |

**Empty state:** “No related threat reports found for this alert.” (not an error)

**Loading:** `EuiLoadingSpinner` inline in section header

**Actions per row:**

- **View report** — navigate to Intelligence Hub route (`public/threat_intelligence/routes.tsx`) with query param `reportId=<id>` (add hub support if missing)
- **Ask Agent Builder** — reuse `useAgentBuilderAttachment` with alert attachment + appended prompt:

  ```
  Using threat_intel.search_reports, summarize threat report {report_id} in the context of this alert's techniques: {technique_ids}.
  ```

  Only show when Agent Builder is available (`useAgentBuilderAvailability`).

### 5.5 Overview tab summary (optional in P0)

If time permits, add to `ThreatIntelligenceOverview`:

```text
{N} related threat {report, reports}
```

as a third `InsightsSummaryRow` when `related_reports.length > 0`, fed by the same hook (lift state or React Query shared key).

## 6. Intelligence Hub deep link

P0 requires a minimal hub affordance to open a report from the flyout.

**Option A (preferred):** Add `?reportId=` handling in `intelligence_hub.tsx` — scroll/highlight the report card or open a side panel.

**Option B (fallback):** Link to `source.url` only when in-app detail is not ready.

Document the chosen option in the PR description.

## 7. Security & privileges

| Concern | Handling |
| ------- | -------- |
| Index access | Server uses `core.elasticsearch.client.asCurrentUser` — same as other threat-intel routes; indices are `.kibana-*` |
| Space isolation | `buildSpaceFilterTerms(spaceId)` on every query |
| Browser direct ES | **Forbidden** — flyout never queries `.kibana-threat-reports*` directly |
| Privilege | `threatIntelligence_read` on route; hide UI when unauthorized |

## 8. Testing

### 8.1 Unit — `flyout_insights.test.ts`

| Case | Expectation |
| ---- | ----------- |
| Layer 1 only | `indicator_reference: threat-report:abc` → one report, `join_reason: ioc_reference` |
| Layer 2 only | technique_ids `['T1059']` → search called with nested query |
| Combined | Layer 1 + overlap dedupes same id |
| Empty techniques + no reference | `related_reports: []` |
| `max_reports` | respects cap |
| Missing Layer 1 doc | `layer_1_resolved: false`, Layer 2 still runs |

### 8.2 Jest — `related_threat_reports_panel.test.tsx`

- Renders rows from mock response
- Empty / loading states
- Gated off when experimental flag false (mock context)

### 8.3 Scout / API (follow-up)

`test/scout/.../flyout_insights.spec.ts` — POST with fixture alert fields against seeded report (can land in same PR or fast follow).

### 8.4 Manual test plan

1. Enable `threatIntelligenceSkillEnabled`, bootstrap threat-intel indices, run source ingestion + IOC sync + hit backfill.
2. Configure Indicator Match rule on `.kibana-threat-intel-indicators`; fire alert → flyout shows Layer 1 report.
3. Behavioral alert with MITRE techniques → flyout shows Layer 2 overlap reports.
4. Alert with neither → empty subsection; legacy enrichment sections unchanged.
5. User without `threatIntelligence_read` → panel hidden.

## 9. Implementation checklist (PR order)

1. Common types + `FLYOUT_INSIGHTS_API_PATH`
2. `flyoutInsights` service + unit tests
3. Route + register in `routes/index.ts`
4. `useFlyoutInsights` hook
5. `RelatedThreatReportsPanel` + wire into `ThreatIntelligenceDetailsView`
6. Hub deep link (Option A or B)
7. Overview summary row (if time)
8. `node scripts/check_changes.ts` + scoped jest

## 10. Follow-up phases (not P0)

| Phase | Deliverable |
| ----- | ----------- |
| P1 | Surface `threat-report:*` in existing enrichment accordion; ops doc for Indicator Match index |
| P2 | `coverage_gap` with `technique_ids` filter + compact flyout badge |
| P3 | Proposed ESQL rules — persist on report or on-demand `hunt_behavior` |
| P4 | Subscription modal in Response using `subscription_confirmation` attachment |

## 11. Open questions

1. **Hub report detail** — Is `?reportId=` on Intelligence Hub acceptable for P0, or do we need a dedicated report flyout?
2. **Subtechnique mapping** — Should Layer 2 match subtechnique IDs against parent techniques on reports, or exact ID only? (P0: exact ID only; document limitation.)
3. **Overview summary** — Include in P0 PR or fast-follow?

## 12. References

- `server/threat_intelligence/workflows/hit_provenance_backfill.yaml` — forward join (report → alert counts)
- `server/threat_intelligence/tasks/ioc_indicator_sync.ts` — `INDICATOR_REFERENCE_PREFIX`
- `common/threat_intelligence/hub/constants.ts` — index patterns, API base path
- `public/flyout_v2/document/tools/threat_intelligence/hooks/use_fetch_threat_intelligence.ts` — existing enrichment path (unchanged)
- `docs/rfcs/0001_streams_layer3_grounded_hypothesis_flow.md` — Layer 3 explicitly out of scope
