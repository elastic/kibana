# Observability Agent Builder Tools

## About This Document

**Audience**: LLM coding agents assisting with Observability tool development.

**Team mission**: The Observability AI team builds tools that help Site Reliability Engineers (SREs) investigate incidents and reduce Mean Time To Resolution (MTTR). Tools expose Observability data (logs, metrics, traces) to LLM agents that assist SREs during incident response.

**Include**: Elastic-specific domain knowledge (field mappings, data types, metric computation) and codebase conventions not easily discoverable from existing code.

**Exclude**: Generic advice, info in LLM training data, anything discoverable by reading existing tools.

---

## 1. Tool-to-Investigation Phase Mapping

| Phase           | Example Tools                                                |
| --------------- | ------------------------------------------------------------ |
| **Detection**   | `get_alerts`, `get_services`                                 |
| **Scope**       | `get_services`, `get_hosts`, `get_trace_metrics`             |
| **Timeline**    | `get_trace_metrics` (time series), `run_log_rate_analysis`   |
| **Correlation** | `get_correlated_logs`, `get_downstream_dependencies`         |
| **Root Cause**  | `get_log_groups`, `get_trace_metrics` (grouped by dimension) |

---

## 2. Design Principles

### LLM Optimization

1. **Self-documenting for tool selection** — Tool descriptions should enable LLMs to choose the right tool and use it correctly without external context.

2. **Structured for summarization** — Output should be easy for LLMs to extract insights and present them in natural language to users.

3. **Progressive disclosure** Return high-level summaries first to conserve context window tokens. The agent needs to see the shape of the data and identifying information to decide where to drill down. Tool parameters must be available for deeper investigation when needed.

### Tool Design

4. **Answer specific questions** — A tool that tries to answer too many questions becomes confusing for the LLM to select. Split complex tools into focused, composable tools.

5. **Minimal required parameters** — Common use cases should require zero or one parameter. Use sensible defaults.

6. **Cross-tool navigation** — Tool output and descriptions should enable the LLM to suggest logical next steps (e.g., after `get_services` finds an unhealthy service, suggest `get_trace_metrics` to drill down).

### Data & Implementation

7. **Noise reduction** — Filter out irrelevant data; return only what's useful for incident investigation. Prioritize actionable information.

8. **ECS and OTel compatible** — Tools must work with both Elastic Common Schema and OpenTelemetry data formats.

9. **Guard rails** — Use concurrency limits and result caps to avoid overloading Elasticsearch.

10. **Simple implementation** — Code should be maintainable, easy to read, and avoid unnecessary complexity.

---

## 3. Tool Description Guidelines

The LLM selects tools based solely on the description and parameter schema. Poor descriptions lead to wrong tool selection.

### Rules

- First sentence should be action-oriented: "Retrieves...", "Identifies...", "Analyzes..."
- Include 2-4 concrete "When to use" scenarios
- Include "When NOT to use" with references to alternative tools
- Reference related tools by their tool ID to enable LLM navigation
- Avoid implementation details in the description
- Keep total description under 500 words

---

## 4. Parameter Naming Conventions

Use consistent parameter names across all Observability tools:

| Category       | Parameter     | Type   | Notes                                              |
| -------------- | ------------- | ------ | -------------------------------------------------- |
| **Time**       | `start`       | string | Elasticsearch date math (e.g., `now-1h`)           |
|                | `end`         | string | Elasticsearch date math (e.g., `now`)              |
| **Filters**    | `kqlFilter`   | string | KQL query string. Not `query`, `filter`, or `kql`. |
| **Entities**   | `serviceName` | string | Maps to `service.name`                             |
|                | `hostName`    | string | Maps to `host.name`                                |
|                | `environment` | string | Maps to `service.environment`                      |
| **Grouping**   | `groupBy`     | string | Field to aggregate by                              |
| **Pagination** | `limit`       | number | Maximum results to return                          |

---

## 5. ECS and OpenTelemetry Compatibility

Tools must work with both ECS (Elastic Common Schema) and OpenTelemetry data. Observability index templates in Elasticsearch provides **field aliases** that map OTel fields to their ECS equivalents, so queries only need to use ECS field names.

### Key Points

1. **Query ECS fields only** — Aliases handle the mapping automatically. For example, query `message` not `body.text` (though `_source` will still show the original field name).

2. **APM metrics are unchanged** — OTel traces are pre-aggregated into the same APM metric format via:

   - Managed OTLP endpoint (automatic)
   - Self-managed: [EDOT Collector with Elastic APM Processor](https://www.elastic.co/docs/reference/edot-collector/components/elasticapmprocessor)

3. **Full alias list** — See [ECS to OTel aliases](https://gist.github.com/sorenlouv/5ed2a53c3a43504c0fea7a7a992d18af) for complete mappings extracted from Elasticsearch component templates.

### Common Aliases

| ECS Alias              | OTel Field               |
| ---------------------- | ------------------------ |
| `message`              | `body.text`              |
| `log.level`            | `severity_text`          |
| `trace.id`             | `trace_id`               |
| `span.id`              | `span_id`                |
| `service.environment`  | `deployment.environment` |
| `kubernetes.pod.name`  | `k8s.pod.name`           |
| `kubernetes.namespace` | `k8s.namespace.name`     |

You can retrieve the full list of OTel aliases in a cluster:

```bash
curl -s -u elastic:changeme "http://localhost:9200/*otel*/_mapping/field/*" | jq '[.[] | .mappings | to_entries[] | select(.value.mapping[].type == "alias") | {alias: .key, target: .value.mapping[].path}] | unique'
```

---

## 6. APM Data Types

APM data is stored in multiple document types with different field structures. Understanding these is critical for writing correct aggregations.

### Transaction Latency Fields

Transaction latency is stored in three different field types depending on the document type:

| Document Type              | Latency Field                    | Field Type                | Notes                                      |
| -------------------------- | -------------------------------- | ------------------------- | ------------------------------------------ |
| `TransactionEvent`         | `transaction.duration.us`        | `long`                    | Individual transaction events              |
| `TransactionMetric`        | `transaction.duration.histogram` | `histogram`               | Pre-aggregated by transaction name         |
| `ServiceTransactionMetric` | `transaction.duration.summary`   | `aggregate_metric_double` | Pre-aggregated by service (highest rollup) |

**Key insight**: Elasticsearch's `avg` aggregation natively supports all three field types—it computes weighted averages for histograms and uses pre-stored sum/count for aggregate_metric_double. No special handling needed.

**Throughput caveat**: For `ServiceTransactionMetric`, `doc_count` does NOT equal transaction count. Use `value_count` on the appropriate field instead of relying on `_count`.

**Percentiles**: Only `TransactionEvent` and `TransactionMetric` support percentile aggregations. `ServiceTransactionMetric` uses `aggregate_metric_double` which only stores sum/count — thus percentiles cannot be computed.

### Error Rate Fields

For `TransactionEvent` and `TransactionMetric`, each document has `event.outcome` (`success`, `failure`, or `unknown`). Use filter aggregations to count outcomes.

For `ServiceTransactionMetric`, outcomes are pre-aggregated in `event.success_count` (aggregate_metric_double):

- `sum` = number of successful transactions
- `value_count` = total transactions with known outcome (success + failure)
- Failure rate = `(value_count - sum) / value_count`

| Document Type              | Field                 | Type                      |
| -------------------------- | --------------------- | ------------------------- |
| `TransactionEvent`         | `event.outcome`       | `keyword`                 |
| `TransactionMetric`        | `event.outcome`       | `keyword`                 |
| `ServiceTransactionMetric` | `event.success_count` | `aggregate_metric_double` |

### Processor Events and Metricset Names

APM documents are categorized by `processor.event`:

| `processor.event` | Description                   |
| ----------------- | ----------------------------- |
| `transaction`     | Individual transaction events |
| `span`            | Span events                   |
| `metric`          | All pre-aggregated metrics    |
| `error`           | Error events                  |

For metric documents, filter by `metricset.name` to query specific types:

| `metricset.name`      | Use case                               |
| --------------------- | -------------------------------------- |
| `transaction`         | Transaction metrics (per endpoint)     |
| `service_transaction` | Service-level metrics (highest rollup) |
| `service_destination` | Outgoing requests to dependencies      |
| `span_breakdown`      | Time spent by span type (`span.type`)  |
| `app`                 | System metrics (CPU, memory)           |

### Service Destination Metrics

Service destination metrics capture **outgoing** request metrics from a service to its dependencies. Use these for dependency/connection performance, not service performance.

| Field                                           | Description                                      |
| ----------------------------------------------- | ------------------------------------------------ |
| `span.destination.service.resource`             | Dependency name (e.g., `elasticsearch`, `redis`) |
| `span.destination.service.response_time.sum.us` | Total latency (sum of all request durations)     |
| `span.destination.service.response_time.count`  | Number of requests                               |
| `event.outcome`                                 | `success` or `failure`                           |

**Metrics derivation**:

- Latency: `response_time.sum.us / response_time.count`
- Throughput: `response_time.count` over time
- Error rate: Filter by `event.outcome: failure`, divide by total count

**References**:

- [APM Queries Dev Docs](https://github.com/elastic/kibana/blob/main/x-pack/solutions/observability/plugins/apm/dev_docs/apm_queries.md)
- [Service Destination Metrics (Public Docs)](https://www.elastic.co/docs/solutions/observability/apm/metrics#_service_destination_metrics)
- [Aggregate Metric Double Field Type](https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/aggregate-metric-double)

---

## 7. Testing and Development

### File Locations

- Tools: `x-pack/solutions/observability/plugins/observability_agent_builder/server/tools/`
- API Tests: `x-pack/solutions/observability/test/api_integration_deployment_agnostic/apis/observability_agent_builder/tools/`
- Synthtrace Scenarios: `src/platform/packages/shared/kbn-synthtrace/src/scenarios/agent_builder/tools/`

### Synthtrace Scenarios

Every tool MUST have a Synthtrace scenario. Run with:

```bash
node scripts/synthtrace \
  src/platform/packages/shared/kbn-synthtrace/src/scenarios/agent_builder/tools/<tool_name>/<scenario>.ts \
  --from "now-1h" --to "now" --clean
```

### Executing Tools Locally

Test your tool directly via the API:

```bash
curl -X POST http://localhost:5601/api/agent_builder/tools/_execute \
  -u elastic:changeme \
  -H 'kbn-xsrf: true' \
  -H 'x-elastic-internal-origin: kibana' \
  -H 'Content-Type: application/json' \
  -d '{
    "tool_id": "observability.<tool_name>",
    "tool_params": { "start": "now-1h", "end": "now" }
  }'
```

### Chatting with the Observability Agent

Test your tools end-to-end by chatting with the Observability agent:

```bash
curl -X POST http://localhost:5601/api/agent_builder/converse \
  -u elastic:changeme \
  -H 'kbn-xsrf: true' \
  -H 'x-elastic-internal-origin: kibana' \
  -H 'Content-Type: application/json' \
  -d '{
    "input": "What services are experiencing issues?",
    "agent_id": "observability.agent"
  }'
```

Notes:

- To continue a conversation, include the `conversation_id` from the previous response
- For streaming responses (SSE), use the `/api/agent_builder/converse/async` endpoint

### API Integration Tests

The Kibana API test server: http://elastic:changeme@localhost:5620
The Elasticsearch test server: http://elastic:changeme@localhost:9220

To run the API tests for a tool:

```
node scripts/functional_test_runner --config x-pack/solutions/observability/test/api_integration_deployment_agnostic/configs/stateful/oblt.ai_agent.stateful.config.ts --grep="<tool_name>"
```

The API tests for tools must be added to: `x-pack/solutions/observability/test/api_integration_deployment_agnostic/apis/observability_agent_builder/tools/`

### Allow list

All new tools **must** be added to the Agent Builder allow list:

```
x-pack/platform/packages/shared/agent-builder/agent-builder-server/allow_lists.ts
```

---

## 8. Testing with OpenTelemetry Demo

The [OpenTelemetry Demo](https://github.com/elastic/opentelemetry-demo) is a microservices application that generates realistic Observability data (traces, logs, metrics) and supports feature flags to simulate various failure scenarios. Use it to validate the Observability Agent and individual tools against real-world-like incidents.

### Starting the OTel Demo

Clone the repo and start the demo, configured to send data to your local Elasticsearch:

```bash
cd /path/to/opentelemetry-demo

# Create an API key for the demo
API_KEY=$(curl -s -X POST "http://localhost:9200/_security/api_key" \
  -u elastic:changeme \
  -H "Content-Type: application/json" \
  -d '{ "name": "opentelemetry-demo" }' | jq -r .encoded)

sed -i '' -E "s|^ELASTICSEARCH_ENDPOINT=.*|ELASTICSEARCH_ENDPOINT=\"http://host.docker.internal:9200\"|" .env.override
sed -i '' -E "s|^ELASTICSEARCH_API_KEY=.*|ELASTICSEARCH_API_KEY=$API_KEY|" .env.override

# Start all services
make start
```

This starts ~28 Docker containers. Wait for all containers to be healthy before proceeding. The demo sends data to the local Elasticsearch instance at `localhost:9200`.

### Feature Flags

Feature flags are configured via the `flagd` service. Edit the file:

```
/path/to/opentelemetry-demo/src/flagd/demo.flagd.json
```

Flagd watches this file for changes — edits take effect automatically (no restart needed).

To enable a flag, change its `defaultVariant` from `"off"` to `"on"` (or to a specific variant for flags with multiple levels):

```json
"paymentUnreachable": {
  "defaultVariant": "on",
  ...
}
```

To disable a flag, set `defaultVariant` back to `"off"`.

Full list of available feature flags: https://opentelemetry.io/docs/demo/feature-flags/

### Cleaning Data Between Test Runs

Between test runs, delete all APM data streams to avoid data from previous scenarios polluting results:

```bash
for ds in traces-apm-default \
           logs-apm.error-default \
           metrics-apm.internal-default \
           metrics-apm.transaction.1m-default \
           metrics-apm.service_destination.1m-default \
           metrics-apm.service_transaction.1m-default \
           metrics-apm.service_summary.1m-default; do
  curl -s -X DELETE "http://elastic:changeme@localhost:9200/_data_stream/$ds" | jq -r '.acknowledged // .error.type'
done
```

### Wait for Data Accumulation

After enabling feature flags and cleaning data, **wait at least 10 minutes** before running an investigation. This ensures enough metric rollups and trace data have been generated for meaningful analysis.

When running the investigation tool, use a lookback window that matches the wait time:

```bash
curl -s --max-time 600 -X POST http://localhost:5601/api/agent_builder/tools/_execute \
  -u elastic:changeme \
  -H 'kbn-xsrf: true' \
  -H 'x-elastic-internal-origin: kibana' \
  -H 'Content-Type: application/json' \
  -d '{
    "tool_id": "observability.run_investigation",
    "tool_params": { "start": "now-10m", "end": "now" }
  }'
```

Note: the `run_investigation` tool makes multiple internal LLM calls and may take 60–120 seconds to complete. Use `--max-time 600` to avoid curl timeouts.

### Full Test Workflow

```
1. Start OTel demo:          (see "Starting the OTel Demo" above)
2. Clean APM data:           (delete data streams — see above)
3. Enable feature flag(s):   Edit demo.flagd.json
4. Wait 30 minutes:          sleep 600
5. Run investigation:        curl ... run_investigation with start=now-30m
6. Review results
7. Disable feature flag(s):  Reset defaultVariant to "off"
8. Repeat from step 2 for next scenario
```

### Resetting All Feature Flags

After testing, reset all flags to `"off"` by setting each `defaultVariant` back to `"off"` in `demo.flagd.json`. Verify no flags are accidentally left enabled — leftover flags cause confusing results in subsequent tests.

---

## 9. Pre-Merge Checklist

- [ ] Tool added to `allow_lists.ts`
- [ ] Works with both ECS and OTel data (where applicable)
- [ ] Metrics normalized: ms for latency, per-minute for throughput, 0-1 for failure rate
- [ ] Synthtrace scenario for test data generation
- [ ] API integration tests covering filters, groupBy dimensions, and edge cases

---

## References

- [Elastic Common Schema (ECS)](https://www.elastic.co/docs/reference/ecs/ecs-field-reference)
- [OpenTelemetry Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/)
