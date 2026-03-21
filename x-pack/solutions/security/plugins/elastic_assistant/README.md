# Elastic AI Assistant

This plugin implements server APIs for the `Elastic AI Assistant`. Furthermore, it registers the `Elastic Assistant` in the navigation bar.

For further UI components, see `x-pack/platform/packages/shared/kbn-elastic-assistant`.

## Maintainers

Maintained by the Security Solution team

## Graph structure

### Default Assistant graph

![DefaultAssistantGraph](./docs/img/default_assistant_graph.png)

### Default Attack discovery graph

![DefaultAttackDiscoveryGraph](./docs/img/default_attack_discovery_graph.png)

### Default Defend insights graph

![DefaultDefendInsightsGraph](./docs/img/default_defend_insights_graph.png)

## Alert Investigation Pipeline

> **Status:** Spike / Proof-of-concept (see [security-team#16339](https://github.com/elastic/security-team/issues/16339))
>
> **Feature Flag:** `elasticAssistant.alertInvestigationPipelineEnabled` (disabled by default)

The pipeline automates the flow from raw security alerts to organized investigation cases with Attack Discovery. It lives under `server/lib/attack_discovery/pipeline/`.

### Enabling the Pipeline

This feature is experimental and disabled by default. To enable it, add to your `kibana.yml`:

```yaml
xpack.feature_flags.overrides:
  elasticAssistant.alertInvestigationPipelineEnabled: true
```

After enabling, restart Kibana and navigate to: http://localhost:5601/app/alert-investigation-pipeline

### Architecture

```
Unprocessed Alerts
        │
        ▼
┌─────────────────┐
│  Deduplication   │  Hash + Jaccard similarity clustering (Union-Find)
└────────┬────────┘
         ▼
┌─────────────────┐
│ Entity Extraction│  30+ ECS fields → 13 observable types
└────────┬────────┘
         ▼
┌─────────────────┐
│  Case Matching   │  Weighted entity overlap scoring against open cases
└────────┬────────┘
         ▼
┌──────────────────────────┐
│ Alert ↔ Case Attachment  │  Attach alerts to matched or new cases
└────────┬─────────────────┘
         ▼
┌─────────────────┐
│ Incremental AD   │  Delta-based Attack Discovery per case
└─────────────────┘
```

### Deduplication Strategy

**Current (Phase 1)**: Jaccard similarity (lexical matching)
- Fast, deterministic, works in all deployments
- No ML node required, zero cost
- Handles exact/near-exact duplicates effectively (~85% accuracy)

**Future (Phase 2)**: ELSER semantic embeddings (tracked in [security-team#16415](https://github.com/elastic/security-team/issues/16415))
- Semantic understanding of alert content
- Handles encoded commands, randomized filenames, different log sources
- Expected +15-30% improvement in dedup rate
- Requires ML node with ELSER deployed

### Pipeline stages

| Stage | Module | Description |
|-------|--------|-------------|
| **Fetch** | `orchestrator.ts` | Queries `.alerts-security.alerts-default` for open/acknowledged alerts within a lookback window, excluding building blocks and already-processed alerts |
| **Deduplicate** | `deduplication/` | Groups alerts by exact feature-text hash and Jaccard token similarity (Phase 1); ELSER semantic embeddings planned for Phase 2 |
| **Extract entities** | `entity_extraction/` | Maps 30+ ECS fields to 13 observable types (`ipv4`, `ipv6`, `hostname`, `user`, `process`, `file_hash`, `file_path`, `url`, `domain`, `email`, `agent_id`, `registry`, `service`) with per-alert deduplication |
| **Match to cases** | `case_matching/` | Scores entity overlap between alert entities and existing case observables using configurable weights and optional temporal decay |
| **Attach & create** | `orchestrator.ts` | Attaches alerts to matched cases or creates new cases for unmatched alerts; adds deduplicated observables via `bulkAddObservables` |
| **Incremental AD** | `incremental/`, `case_integration/` | Computes delta alerts per case using a tracker index with optimistic concurrency control, then triggers scoped Attack Discovery |
| **Tag processed** | `orchestrator.ts` | Marks all fetched alerts with `kibana.alert.pipeline.processed` to prevent re-processing |

### API routes

**Run pipeline (dry-run or full)**

```
POST /internal/elastic_assistant/attack_discovery/pipeline/_run
```

Body:
```json
{
  "dry_run": true,
  "max_alerts": 500,
  "lookback_minutes": 15,
  "similarity_threshold": 0.85
}
```

**Trigger incremental AD for a case**

```
POST /internal/elastic_assistant/attack_discovery/pipeline/case/{caseId}/_trigger_ad
```

Body:
```json
{
  "alert_ids": ["alert-id-1", "alert-id-2"]
}
```

### Workflow steps

The pipeline registers 4 server-side workflow step definitions (via `workflowsExtensions` optional plugin dependency):

| Step ID | Purpose |
|---------|---------|
| `security.fetchUnprocessedAlerts` | Fetch unprocessed alerts within a lookback window |
| `security.deduplicateAlerts` | Deduplicate alerts by similarity |
| `security.extractEntities` | Extract observable entities from alert ECS fields |
| `security.tagProcessedAlerts` | Tag alerts as processed to prevent re-processing |

### Configuration

All stages are independently toggleable via `PipelineConfig`. Defaults:

| Setting | Default | Description |
|---------|---------|-------------|
| `intervalMinutes` | `15` | Lookback window for fetching alerts |
| `deduplication.similarityThreshold` | `0.85` | Jaccard similarity threshold for clustering |
| `caseMatching.strategy` | `weighted` | Scoring strategy (`strict`, `relaxed`, `weighted`, `temporal`) |
| `caseMatching.matchThreshold` | `0.3` | Minimum score to match an alert to a case |
| `caseMatching.weights.ip` | `1.0` | Weight for IP entity matches |
| `caseMatching.weights.hostname` | `0.8` | Weight for hostname matches |
| `caseMatching.weights.user` | `0.7` | Weight for user matches |
| `caseMatching.weights.fileHash` | `1.0` | Weight for file hash matches |
| `caseMatching.temporalDecayDays` | `30` | Days after which case recency score decays to 0.1 |
| `incrementalAd.minNewAlerts` | `2` | Minimum new alerts before triggering incremental AD |

### Key design decisions

- **Observable type key mapping**: The pipeline uses bare keys (`ipv4`, `user`, `process`) internally, while the Cases plugin expects prefixed keys (`observable-type-ipv4`). Bidirectional mappings in `orchestrator.ts` and `case_matcher.ts` handle the translation.
- **Processed alert tracking**: Uses a dedicated hidden index (`.security-ad-processed-alerts-{spaceId}`) with optimistic concurrency control (`if_seq_no`/`if_primary_term`) and 3 retries for conflict resolution.
- **Deduplication**: Two-pass approach — exact hash match first, then Jaccard similarity within same-rule/same-host groups — using a Union-Find data structure for transitive clustering.
- **Building block exclusion**: Building block alerts (sub-alerts from certain rule types) are filtered out at fetch time across all entry points (orchestrator, route handler, workflow step).

### UI Dashboard

**Accessing the dashboard:**

1. Start Kibana: `yarn start`
2. Navigate to **"Security" → "Alert Investigation Pipeline (Spike)"** in the Kibana nav
3. **OR** directly visit: `http://localhost:5601/app/alert-investigation-pipeline`

**Dashboard features:**
- Real-time health monitoring (`healthy` / `degraded` / `unhealthy`)
- Performance metrics (success rate, avg duration, consecutive failures)
- Pipeline statistics (alerts processed, cases matched/created, AD triggered)
- Configuration UI (update thresholds, strategies, triggers)

**Screenshot after local testing:**
- See `docs/screenshots/` for demo walkthrough visuals

### Known limitations

- Hardcoded to `.alerts-security.alerts-default` index (default space only)
- Case matching limited to 100 most recently updated open cases
- Direct bulk writes to alert documents bypass the alerting framework
- UI dashboard is basic — production would need RBAC, i18n, error boundaries

## Development

### Generate graph structure

To generate the graph structure, run `yarn draw-graph` from the plugin directory.
The graphs will be generated in the `docs/img` directory of the plugin.

### Testing

**Unit tests:**

To run the tests for this plugin, run `node scripts/jest --watch x-pack/solutions/security/plugins/elastic_assistant/jest.config.js --coverage` from the Kibana root directory.

**Scout E2E tests (Pipeline Dashboard):**

```bash
# Run pipeline dashboard E2E tests
node scripts/scout run-tests \
  --arch stateful \
  --config x-pack/solutions/security/plugins/elastic_assistant/test/scout_ui/scout.config.ts \
  --testFiles "test/scout_ui/pipeline/alert_investigation_pipeline.spec.ts"
```

**Coverage:**
- ✅ Navigate to dashboard via Kibana nav
- ✅ Health status displays correctly
- ✅ Metrics load and render
- ✅ Refresh action works
- ✅ Error states handled gracefully
- ✅ No console errors on load
