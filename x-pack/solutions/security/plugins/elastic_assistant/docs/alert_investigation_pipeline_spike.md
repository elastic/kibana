# Alert Investigation Pipeline - Spike Documentation

**Author:** Patryk Kopycinski
**Date:** 2026-03-20
**Status:** Spike / Proof-of-Concept
**GitHub Issue:** [security-team#16339](https://github.com/elastic/security-team/issues/16339)

---

## Overview

The **Alert Investigation Pipeline** automates the flow from raw security alerts to organized investigation cases with Attack Discovery integration. It demonstrates end-to-end feasibility of intelligent alert aggregation, case matching, and incremental threat analysis.

**Key Value Proposition:**
- **Reduces analyst burden** by automatically grouping related alerts
- **Accelerates investigation** by matching alerts to existing cases
- **Improves context** through entity extraction and enrichment
- **Scales Attack Discovery** via incremental delta-based execution

---

## Architecture

### Data Flow

```
┌─────────────────────┐
│ Unprocessed Alerts  │  (.alerts-security.alerts-default)
└──────────┬──────────┘
           ▼
    ┌──────────────┐
    │ Deduplication │  Hash + Jaccard similarity (Union-Find)
    └──────┬───────┘
           ▼
 ┌──────────────────┐
 │ Entity Extraction │  30+ ECS fields → 13 observable types
 └─────────┬────────┘
           ▼
  ┌────────────────┐
  │ Case Matching  │  Weighted entity overlap scoring
  └───────┬────────┘
          ▼
┌────────────────────────┐
│ Alert ↔ Case Attachment │  Attach to matched or new cases
└───────┬────────────────┘
        ▼
  ┌────────────┐
  │ Incremental │  Delta-based Attack Discovery per case
  │     AD      │
  └────────────┘
```

### Components

| Layer | Component | Path | Purpose |
|-------|-----------|------|---------|
| **Orchestrator** | Pipeline orchestrator | `server/lib/attack_discovery/pipeline/orchestrator.ts` | Coordinates all stages, manages state, handles errors |
| **Fetch** | Alert fetcher | `server/lib/attack_discovery/pipeline/fetch_alerts_paginated.ts` | Queries unprocessed alerts with pagination |
| **Deduplicate** | Deduplication engine | `server/lib/attack_discovery/pipeline/deduplication/` | Groups similar alerts using hash + Jaccard |
| **Extract** | Entity extractor | `server/lib/attack_discovery/pipeline/entity_extraction/` | Maps ECS fields to observable types |
| **Match** | Case matcher | `server/lib/attack_discovery/pipeline/case_matching/` | Scores entity overlap against open cases |
| **Attach** | Case integrator | `server/lib/attack_discovery/pipeline/case_integration/` | Attaches alerts, creates cases, adds observables |
| **Incremental AD** | Delta processor | `server/lib/attack_discovery/pipeline/incremental/` | Tracks processed alerts, triggers scoped AD |
| **Metrics** | Observability | `server/lib/attack_discovery/pipeline/metrics.ts` | Collects health/metrics for monitoring |
| **UI Dashboard** | Monitoring UI | `public/src/components/pipeline_dashboard/` | Health, metrics, config UI |

---

## API Endpoints

### Run Pipeline

**POST** `/internal/elastic_assistant/attack_discovery/pipeline/_run`

Execute full or dry-run pipeline.

**Body:**
```json
{
  "dry_run": true,
  "max_alerts": 500,
  "lookback_minutes": 15,
  "similarity_threshold": 0.85
}
```

**Response:**
```json
{
  "success": true,
  "processed": 237,
  "duplicates_found": 54,
  "cases_matched": 12,
  "cases_created": 3,
  "alerts_attached": 237,
  "ad_triggered": 8,
  "duration_ms": 3421
}
```

### Trigger Incremental AD

**POST** `/internal/elastic_assistant/attack_discovery/pipeline/case/{caseId}/_trigger_ad`

Manually trigger Attack Discovery for a specific case.

**Body:**
```json
{
  "alert_ids": ["alert-id-1", "alert-id-2"]
}
```

### Get Pipeline Health

**GET** `/internal/elastic_assistant/attack_discovery/pipeline/_health`

Returns: `{ status: 'healthy' | 'degraded' | 'unhealthy', reason: string, metrics: {...} }`

### Get Metrics

**GET** `/internal/elastic_assistant/attack_discovery/pipeline/_metrics`

Returns detailed performance metrics.

### Get/Update Config

**GET** `/internal/elastic_assistant/attack_discovery/pipeline/_config`
**PUT** `/internal/elastic_assistant/attack_discovery/pipeline/_config`

Retrieve or update pipeline configuration.

---

## UI Dashboard

### Accessing the Dashboard

1. Start Kibana: `yarn start`
2. Navigate to **"Security" → "Alert Investigation Pipeline (Spike)"** in the Kibana nav
3. **OR** directly visit: `http://localhost:5601/app/alert-investigation-pipeline`

### Dashboard Features

**Health Panel:**
- Real-time status: `healthy` / `degraded` / `unhealthy`
- Status reason (e.g., "No failures in last 24h", "3 consecutive failures")

**Metrics Overview:**
- Total Runs, Success Rate, Avg Duration, Consecutive Failures
- Alerts Processed, Cases Matched, Cases Created, Alerts Attached, AD Triggered
- Last Run timestamp + status badge

**Settings Panel:**
- Deduplicate threshold slider
- Case matching strategy selector
- Incremental AD config (min alerts, auto-trigger)

**Screenshot Locations** (after local testing):
```
docs/screenshots/
  01_navigation.png           - Nav menu showing "Alert Investigation Pipeline"
  02_dashboard_healthy.png    - Dashboard with healthy status
  03_metrics_overview.png     - Metrics panel with sample data
  04_settings_panel.png       - Configuration UI
  05_error_state.png          - Error state display
```

---

## Configuration

### Default Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `intervalMinutes` | `15` | Lookback window for fetching alerts |
| `deduplication.similarityThreshold` | `0.85` | Jaccard threshold (0-1) for clustering |
| `deduplication.maxResults` | `10000` | Max alerts per dedup batch |
| `caseMatching.strategy` | `weighted` | Scoring strategy: `strict` \| `relaxed` \| `weighted` \| `temporal` |
| `caseMatching.matchThreshold` | `0.3` | Min score (0-1) to match alert to case |
| `caseMatching.weights.ip` | `1.0` | Weight for IP matches |
| `caseMatching.weights.hostname` | `0.8` | Weight for hostname matches |
| `caseMatching.weights.user` | `0.7` | Weight for user matches |
| `caseMatching.weights.fileHash` | `1.0` | Weight for file hash matches |
| `caseMatching.temporalDecayDays` | `30` | Days until case recency decays to 0.1 |
| `incrementalAd.minNewAlerts` | `2` | Min new alerts before triggering AD |
| `incrementalAd.autoTriggerOnAttachment` | `true` | Auto-run AD when alerts attached |

---

## Testing

### Unit Tests (12 files)

```bash
# Run all pipeline unit tests
yarn test:jest x-pack/solutions/security/plugins/elastic_assistant/server/lib/attack_discovery/pipeline

# Specific test suites
yarn test:jest x-pack/solutions/security/plugins/elastic_assistant/server/lib/attack_discovery/pipeline/deduplication/deduplicate_alerts.test.ts
yarn test:jest x-pack/solutions/security/plugins/elastic_assistant/server/lib/attack_discovery/pipeline/entity_extraction/extract_entities.test.ts
yarn test:jest x-pack/solutions/security/plugins/elastic_assistant/server/lib/attack_discovery/pipeline/case_matching/case_matcher.test.ts
```

### Scout E2E Tests

```bash
# Run pipeline dashboard E2E tests
node scripts/scout run-tests \
  --arch stateful \
  --config x-pack/solutions/security/plugins/elastic_assistant/test/scout_ui/scout.config.ts \
  --testFiles "test/scout_ui/pipeline/alert_investigation_pipeline.spec.ts"
```

**Test Coverage:**
- ✅ Navigate to dashboard via nav
- ✅ Health status displays correctly
- ✅ Metrics load and render
- ✅ Config can be updated via UI
- ✅ Error states handled gracefully

---

## Key Design Decisions

### 1. Observable Type Key Mapping

**Problem:** Pipeline uses bare keys (`ipv4`, `user`, `process`) internally, Cases plugin expects prefixed keys (`observable-type-ipv4`).

**Solution:** Bidirectional mappings in `orchestrator.ts` and `case_matcher.ts`:
- Pipeline → Cases: Add `observable-type-` prefix
- Cases → Pipeline: Strip `observable-type-` prefix

**Impact:** Zero breaking changes to either system.

### 2. Processed Alert Tracking

**Implementation:** Dedicated hidden index `.security-ad-processed-alerts-{spaceId}` with optimistic concurrency control.

**Why:**
- Prevents duplicate processing
- Enables incremental AD (tracks alert deltas per case)
- Uses `if_seq_no` / `if_primary_term` for conflict resolution (3 retries)

### 3. Deduplication Strategy

**Two-pass approach:**
1. **Exact hash match** — same feature text (rule name + hostname + process + file)
2. **Jaccard similarity** — token overlap within same-rule/same-host groups

**Data structure:** Union-Find for transitive clustering (if A~B and B~C, then A~C).

**Why:** Balances precision (exact hash) with recall (fuzzy matching).

### 4. Building Block Exclusion

**Filter:** `kibana.alert.building_block_type` does NOT exist.

**Where:** All entry points (orchestrator, route handler, workflow step).

**Why:** Building block alerts are sub-alerts from certain rule types (EQL sequences, threshold aggregations) — not actionable on their own.

---

## Demo Script

### Prerequisites
1. Kibana running locally: `yarn start`
2. Security Solution alerts generated (use Prebuilt Rules or synthetic alerts)
3. At least 1 open Security case

### Walkthrough (5 minutes)

**Step 1: Show Navigation Integration (30 sec)**
- Open Kibana → Security nav menu
- **Point out:** "Alert Investigation Pipeline (Spike)" entry
- Click to navigate

**Step 2: Demonstrate Healthy State (1 min)**
- **Show:** Health status badge (`healthy` / `degraded` / `unhealthy`)
- **Explain:** "Green = no failures, Yellow = some failures, Red = consecutive failures"
- **Show:** Key metrics:
  - "237 alerts processed across 15 runs"
  - "Success rate: 93.3%"
  - "Average duration: 3.4 seconds"

**Step 3: Explain Metrics (1.5 min)**
- **Alerts Processed:** Total alerts ingested
- **Cases Matched:** Alerts attached to existing cases
- **Cases Created:** New cases auto-created for unmatched alerts
- **Alerts Attached:** Total alert ↔ case links
- **AD Triggered:** Incremental Attack Discovery runs

**Step 4: Show Configuration UI (1 min)**
- Click "Settings" tab
- **Demonstrate:** Live config update (e.g., adjust similarity threshold)
- **Explain:** Changes take effect immediately (no restart required)

**Step 5: Error Handling (1 min)**
- **Show:** Error state UI (if applicable, or describe)
- **Explain:** Graceful degradation, retry logic, user-friendly error messages

**Step 6: Architecture Review (30 sec)**
- Refer to ASCII diagram in README
- **Key points:**
  - "6 stages: Fetch → Deduplicate → Extract → Match → Attach → Incremental AD"
  - "Each stage independently toggleable"
  - "Metrics collected at every stage"

---

## Known Limitations (Out of Scope for Spike)

### Must-haves for Production:

- [ ] **Multi-space support** — Currently hardcoded to default space (`.alerts-security.alerts-default`)
- [ ] **Case matching pagination** — Limited to 100 most recently updated open cases
- [ ] **RBAC integration** — No privilege checks beyond `elasticAssistant` permission
- [ ] **Feature flag** — Should be gated behind `xpack.elasticAssistant.pipeline.enabled` in `kibana.yml`
- [ ] **i18n** — All UI strings hardcoded in English
- [ ] **Comprehensive error handling** — Some edge cases (network timeouts, Elasticsearch unavailable) not fully handled
- [ ] **Performance optimization** — No caching, lazy loading, or request batching
- [ ] **Security review** — Input validation, injection prevention, XSS audits needed
- [ ] **Monitoring/APM** — Should emit metrics to Elastic APM

### Nice-to-haves:

- [ ] Bulk operations (process multiple pipelines in parallel)
- [ ] Advanced filtering/sorting in UI
- [ ] Export functionality (CSV, JSON reports)
- [ ] Keyboard shortcuts
- [ ] Dark mode support
- [ ] Webhook integrations (Slack, PagerDuty notifications)

---

## What's Next

### Phase 2: Production Readiness (Estimated 3-4 weeks)

**Week 1: Security & RBAC**
- Add feature flag (`xpack.elasticAssistant.pipeline.enabled`)
- Implement privilege checks (read/write/execute)
- Input validation for all API routes
- XSS/CSRF protection audit

**Week 2: Multi-Space & Scale**
- Remove hardcoded `.alerts-security.alerts-default` index
- Support all spaces dynamically
- Case matching pagination (handle >100 cases)
- Performance optimization (caching, batching)

**Week 3: Testing & Observability**
- Expand Scout E2E coverage (20+ test scenarios)
- Integration tests (full pipeline flow with real Elasticsearch)
- APM instrumentation
- Error boundary UI components

**Week 4: i18n & Polish**
- Internationalize all UI strings
- Accessibility audit (a11y)
- Browser compatibility testing (Chrome, Firefox, Safari, Edge)
- Documentation polish (user guide, API reference)

### Phase 3: Advanced Features (Future Enhancements)

- **Enrichment strategies:** MITRE ATT&CK mapping, threat intel lookups, ML anomaly correlation
- **Workflow automation:** Task Manager integration for scheduled runs
- **Custom scoring:** User-defined entity weights per tenant
- **Alert triage UI:** Inline review/approve/reject actions before case creation
- **Reporting:** Weekly/monthly pipeline performance reports

---

## Testing Checklist

### Manual QA (Pre-Demo)

- [ ] Navigate to dashboard via Kibana nav
- [ ] Verify health status displays correctly
- [ ] Metrics update after manual pipeline run
- [ ] Config changes persist across page reloads
- [ ] Error states render user-friendly messages
- [ ] Responsive layout (test at 1024px, 1280px, 1920px)
- [ ] Browser testing (Chrome, Firefox, Safari)
- [ ] Console is clean (no JS errors, no React warnings)

### Automated Tests

- [ ] All unit tests pass: `yarn test:jest ...`
- [ ] Scout E2E test passes (3/3 runs, no flakes)
- [ ] Type check passes: `yarn test:type_check --project ...`
- [ ] ESLint passes: `node scripts/eslint --fix ...`

---

## Links

- **PR:** [#XXXXX](link-to-pr)
- **GitHub Issue:** [security-team#16339](https://github.com/elastic/security-team/issues/16339)
- **README:** `x-pack/solutions/security/plugins/elastic_assistant/README.md`
- **API Routes:** `server/routes/attack_discovery/pipeline/`
- **UI Components:** `public/src/components/pipeline_dashboard/`
- **Tests:** `test/scout_ui/pipeline/`

---

**🔬 This is a spike/PoC.** It demonstrates end-to-end feasibility and provides a foundation for production implementation, but is not production-ready. See "What's Next" for the roadmap.
