## Design

The correlation rule type correlates alerts from multiple detection rules to identify multi-stage attacks. Rather than analyzing raw events, it queries the security alerts index (`.alerts-security.alerts-default`) using ES|QL to find groups of alerts that share entity fields (e.g., `host.name`, `user.name`) within a configurable time window.

There are 4 correlation types, each producing a different ES|QL query shape:

- `temporal`: Multiple rules fire for the same entity within a timespan. Requires `rule_count >= N` (where N = number of configured rules). Detects convergence of independent signals on the same entity.
- `temporal_ordered`: Same as temporal, but adds `SORT @timestamp ASC` before aggregation so the VALUES() output reflects the chronological sequence of alerts. Use when attack stage ordering matters.
- `event_count`: Alert count exceeds a threshold. Uses `COUNT(*)` with a configurable operator/value condition. Detects alert volume spikes.
- `value_count`: Distinct values of a specified field exceed a threshold. Uses `COUNT_DISTINCT(field)` with a configurable condition. Detects breadth-of-impact scenarios (e.g., user accessing many distinct hosts).

The rule type is gated behind the `correlationRulesEnabled` feature flag.

### Architecture

The execution pipeline follows a declarative-to-query pattern:

```
CorrelationConfig (declarative) → compileCorrelationQuery() → ES|QL string → performEsqlRequest() → Alert Writer
```

Key architectural decisions:

- **Reuses existing ES|QL infrastructure**: `buildEsqlSearchRequest` and `performEsqlRequest` from the ES|QL rule type, avoiding duplicated transport/parsing code.
- **Building-block + shell alert pattern**: Same pattern used by EQL sequence rules. Each correlation group produces one "shell" alert (the parent) and N "building block" alerts (one per contributing alert). This enables the alert timeline UI to display correlated alerts as a group.
- **Compile-time query generation**: The entire correlation logic is expressed as a single ES|QL query compiled at rule execution time. No multi-step orchestration or intermediate state.

### ES|QL Query Compilation

`compileCorrelationQuery()` in `compile_correlation_query.ts` converts a `CorrelationConfig` object into a complete ES|QL query string. The compilation handles:

- **Self-correlation guard**: Excludes alerts produced by the correlation rule itself using `kibana.alert.rule.uuid != "<selfRuleId>"`. Uses `completeRule.alertId` (the saved-object UUID), not `ruleId` (the user-facing stable ID), because `alertId` is guaranteed unique and immutable.
- **Rule filter**: `IN (...)` clause for multiple rules, `==` for a single rule. All rule IDs are escaped through `escapeEsqlString()`.
- **GROUP BY**: Validated field names joined into the `BY` clause. Fields are validated with a regex (`/^[a-zA-Z_][a-zA-Z0-9_.]*$/`) to prevent ES|QL injection.
- **STATS aggregations**: Every query shape collects `VALUES(kibana.alert.uuid)` (alert IDs), `VALUES(kibana.alert.rule.name)` (rule names), `MAX(kibana.alert.risk_score)`, `VALUES(kibana.alert.severity)`, and timestamp bounds.
- **LIMIT clause**: Appended as the final pipe, set to `maxSignals + 1` to enable the executor to detect whether results were truncated.

Example compiled query (temporal type, 2 rules, grouped by `host.name`):

```esql
FROM .alerts-security.alerts-default METADATA _id, _index
| WHERE kibana.alert.rule.uuid IN ("rule-uuid-1", "rule-uuid-2")
  AND kibana.alert.rule.uuid != "self-correlation-rule-uuid"
  AND @timestamp >= NOW() - 5m
| STATS
    rule_count = COUNT_DISTINCT(kibana.alert.rule.uuid),
    alert_ids = VALUES(kibana.alert.uuid),
    rule_names = VALUES(kibana.alert.rule.name),
    min_time = MIN(@timestamp),
    max_time = MAX(@timestamp),
    max_risk = MAX(kibana.alert.risk_score),
    severity_list = VALUES(kibana.alert.severity)
  BY host.name
| WHERE rule_count >= 2
| LIMIT 101
```

### Alert Schema

Each correlation group produces two kinds of alerts:

**Shell alert** (the parent):
- `ALERT_UUID` = `ALERT_GROUP_ID` (same UUID, so it self-identifies as the group root)
- `kibana.alert.correlated_alerts`: array of contributing alert UUIDs
- `kibana.alert.correlated_rule_names`: array of contributing rule names
- `kibana.alert.risk_score`: composite risk score (see below)
- `kibana.alert.severity`: highest severity from contributing alerts
- Group-by field values spread into the alert document

**Building blocks** (one per contributing alert):
- `ALERT_BUILDING_BLOCK_TYPE` = `'default'`
- `ALERT_GROUP_ID` = shell alert's UUID (links back to parent)
- `ALERT_GROUP_INDEX` = ordinal position within the group
- `kibana.alert.original_alert.uuid` = the contributing alert's UUID
- Inherits the same risk score and severity as the shell

**Risk scoring**: For temporal and temporal_ordered types, the base max risk score gets a correlation boost: `min(alertCount, 5) * 0.1` multiplied by the max risk, capped at 100. This rewards convergence of multiple signals without unbounded growth. Event count and value count types use the raw max risk score (no boost).

**Severity**: Determined by `computeHighestSeverity()`, which applies a strict ordering: `critical > high > medium > low`. The first match from the contributing alerts wins.

### Performance Safeguards

Multiple layers prevent unbounded resource consumption:

1. **`MAX_BUILDING_BLOCKS_PER_GROUP = 500`**: Per-group cap on contributing alert IDs. Groups with more alerts are truncated with a warning log.
2. **`maxSignals` early-stop**: The group processing loop breaks as soon as the total alerts created (shell + building blocks) reaches `maxSignals`. This prevents processing all groups when only a fraction fit within limits.
3. **ES|QL `LIMIT` clause**: Set to `maxSignals + 1` at the database level, so Elasticsearch never returns more groups than the executor can process. The `+1` lets the executor detect truncation.
4. **`wrappedAlerts.slice(0, maxSignals)`**: Final safety net before `bulkCreate`, ensuring the bulk write never exceeds the configured limit.
5. **`performance.now()` instrumentation**: Both the ES|QL search and alert construction phases are timed and logged, enabling performance monitoring and debugging.

### Security

- **`escapeEsqlString()`**: Escapes backslashes and double quotes in string literals before interpolation into ES|QL queries. Prevents injection via rule IDs or other user-supplied strings.
- **`validateFieldName()`**: Regex validation (`/^[a-zA-Z_][a-zA-Z0-9_.]*$/`) for `groupBy` fields and `condition.field`. Rejects any field name that could alter ES|QL query structure.
- **Self-correlation guard**: Uses `completeRule.alertId` (the saved-object UUID), not the user-facing `ruleId`. This is critical because `alertId` cannot be spoofed or reused across rules.

### Limitations and Future Enhancements

- **VALUES() cardinality**: The `VALUES()` aggregation may produce large arrays for high-cardinality groups (e.g., a host generating thousands of alerts). The `MAX_BUILDING_BLOCKS_PER_GROUP` cap mitigates this but the ES|QL response itself can still be large.
- **No nested field support**: ES|QL does not support `nested` typed fields, so correlation cannot group by nested fields.
- **Feature flag gated**: The rule type is not enabled by default. Requires `correlationRulesEnabled` feature flag.
- **No alert enrichment**: Building blocks reference contributing alerts by UUID but do not copy their full content. Downstream UIs must resolve the `original_alert.uuid` to display contributing alert details.
- **Timespan is absolute**: The `NOW() - timespan` window is evaluated at query time, not relative to the rule's `from`/`to` tuple. This means the correlation window is independent of the rule schedule interval.

### Cross-Cluster Correlation

The correlation engine supports cross-cluster search (CCS) to correlate alerts across multiple Elasticsearch clusters. This enables detection of distributed attack patterns where signals originate from different clusters in a multi-cluster deployment.

**Configuration**: Add remote cluster names to the `remoteClusters` array in the correlation config. Each name must match the pattern `[a-zA-Z0-9_-]+` (alphanumeric with hyphens and underscores).

**Prerequisites**:
- Remote clusters must be configured in the local cluster's `_cluster/settings` (see [Elasticsearch CCS docs](https://www.elastic.co/guide/en/elasticsearch/reference/current/modules-cross-cluster-search.html)).
- The API key used by the detection engine must have `read` privileges on `.alerts-security.alerts-default` in each remote cluster, or a cross-cluster API key must be configured.
- Remote clusters must run compatible Elasticsearch versions.

**How it works**: When `remoteClusters` is set, the compiled ES|QL `FROM` clause includes both the local and remote alert indices using the `cluster:index` syntax. For example, with `remoteClusters: ["cluster-west", "cluster-east"]`:

```esql
FROM .alerts-security.alerts-default, cluster-west:.alerts-security.alerts-default, cluster-east:.alerts-security.alerts-default METADATA _id, _index
| WHERE ...
```

Remote cluster names are validated with `validateClusterName()`, which enforces the `[a-zA-Z0-9_-]+` pattern, preventing ES|QL injection through cluster names.
