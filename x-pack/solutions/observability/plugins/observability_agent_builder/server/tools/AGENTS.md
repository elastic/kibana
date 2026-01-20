# Best Practices for Observability Agent Builder Tools

This document defines best practices for implementing Observability tools in Kibana Agent Builder. These tools are optimized for LLM use in incident investigation scenarios where Site Reliability Engineers (SREs) need to quickly understand what happened and how to fix it.

---

## 1. SRE Incident Investigation Workflow

Understanding how SREs investigate incidents is essential for designing effective tools. The LLM acts as an intelligent assistant that helps SREs answer critical questions faster.

### The Questions SREs Ask

During incident investigation, SREs follow a mental model of progressive diagnosis:

| Phase           | Questions                                                                | Example Tools                                                    |
| --------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| **Detection**   | Is something wrong? What alerts fired? What's the current system health? | `get_alerts`, `get_services`                                     |
| **Scope**       | What services/hosts are affected? How widespread is the impact?          | `get_services`, `get_hosts`, `get_trace_metrics`                 |
| **Timeline**    | When did it start? What changed around that time?                        | `get_trace_metrics` (time series), `run_log_rate_analysis`       |
| **Correlation** | What errors preceded this? What's the sequence of events?                | `get_correlated_logs`, `get_downstream_dependencies`             |
| **Root Cause**  | Why did this happen? What's the underlying issue?                        | `get_log_categories`, `get_trace_metrics` (grouped by dimension) |
| **Resolution**  | How do I fix it? Has this happened before?                               | Documentation tools, runbook integration                         |

Each tool should clearly map to one or more of these investigation phases.

### The RED and USE Methods

Tools exposing metrics should align with industry-standard methodologies:

**RED Method** (for services/request-driven systems):

- **R**ate — requests per second (throughput)
- **E**rrors — failed requests per second (error rate)
- **D**uration — latency/response time

**USE Method** (for resources/infrastructure):

- **U**tilization — percentage of resource capacity used
- **S**aturation — queue depth, waiting work
- **E**rrors — error counts

### Progressive Disclosure

Design tools to support an investigative workflow where each tool naturally leads to the next:

```
┌─────────────────────────────────────────────────────────────┐
│  LEVEL 1: Overview (Wide scope, low detail)                 │
│  get_services → "12 services. 2 critical, 3 warning."       │
│  get_alerts   → "5 active alerts. 2 critical."              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  LEVEL 2: Scoped Analysis (Narrower scope, more detail)     │
│  get_trace_metrics(service=payment) → metrics by endpoint   │
│  get_log_categories(service=payment) → error patterns       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  LEVEL 3: Deep Investigation (Narrow scope, high detail)    │
│  get_correlated_logs(trace.id=xyz) → full event sequence    │
│  get_trace_metrics(groupBy=host.name) → per-host breakdown  │
└─────────────────────────────────────────────────────────────┘
```

The `groupBy` parameter is itself a progressive disclosure mechanism—allowing drill-down from service → transaction → host → container.

---

## 2. Design Principles

### LLM Optimization

1. **Self-documenting for tool selection** — Tool descriptions should enable LLMs to choose the right tool and use it correctly without external context.

2. **Structured for summarization** — Output should be easy for LLMs to extract insights and present them in natural language to users.

3. **Progressive disclosure** — Return high-level summaries first; provide parameters for deeper investigation when needed.

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

### Parameter Description Guidelines

- Include 2-3 concrete examples in the description
- Specify valid values for enums
- Document default behavior when parameter is omitted

---

## 5. ECS and OpenTelemetry Compatibility

Tools must work with both [ECS (Elastic Common Schema)](https://www.elastic.co/docs/reference/ecs/ecs-field-reference) and [OpenTelemetry Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/).

### Common Field Mappings

When querying or filtering, check **both** ECS and OTel field variants:

| Concept            | ECS Field                   | OTel Field                       |
| ------------------ | --------------------------- | -------------------------------- |
| **Service**        |                             |                                  |
| Service name       | `service.name`              | `service.name` ✓                 |
| Service version    | `service.version`           | `service.version` ✓              |
| Environment        | `service.environment`       | `deployment.environment`         |
| **Infrastructure** |                             |                                  |
| Host name          | `host.name`                 | `host.name` ✓                    |
| Container ID       | `container.id`              | `container.id` ✓                 |
| Pod name           | `kubernetes.pod.name`       | `k8s.pod.name`                   |
| Namespace          | `kubernetes.namespace`      | `k8s.namespace.name`             |
| **Logs**           |                             |                                  |
| Message            | `message`                   | `Body`                           |
| Log level          | `log.level`                 | `SeverityText`, `SeverityNumber` |
| **Traces**         |                             |                                  |
| Trace ID           | `trace.id`                  | `trace_id`, `TraceId`            |
| Span ID            | `span.id`                   | `span_id`, `SpanId`              |
| **HTTP**           |                             |                                  |
| Status code        | `http.response.status_code` | `http.response.status_code` ✓    |
| Method             | `http.request.method`       | `http.request.method` ✓          |

### Common Observability Dimensions

Tools that support grouping or filtering should support these common dimensions:

#### Service Dimensions

| Field (ECS)           | OTel Equivalent          | Use Case                               |
| --------------------- | ------------------------ | -------------------------------------- |
| `service.name`        | `service.name` ✓         | Identify which service is affected     |
| `service.version`     | `service.version` ✓      | Compare performance across deployments |
| `service.environment` | `deployment.environment` | Compare staging vs production          |

#### Transaction/Request Dimensions

| Field (ECS)                 | OTel Equivalent               | Use Case                                    |
| --------------------------- | ----------------------------- | ------------------------------------------- |
| `transaction.name`          | `span.name` (root span)       | Identify slow/failing endpoints             |
| `transaction.type`          | `span.kind`                   | Filter by request type (request, page-load) |
| `http.response.status_code` | `http.response.status_code` ✓ | Analyze by HTTP status (4xx, 5xx errors)    |

#### Infrastructure Dimensions

| Field (ECS)                  | OTel Equivalent       | Use Case                             |
| ---------------------------- | --------------------- | ------------------------------------ |
| `host.name`                  | `host.name` ✓         | Identify affected hosts              |
| `container.id`               | `container.id` ✓      | Identify affected containers         |
| `kubernetes.pod.name`        | `k8s.pod.name`        | Identify affected K8s pods           |
| `kubernetes.node.name`       | `k8s.node.name`       | Identify K8s node-level issues       |
| `kubernetes.deployment.name` | `k8s.deployment.name` | Compare across deployments/rollbacks |
| `kubernetes.namespace`       | `k8s.namespace.name`  | Filter by K8s namespace              |

#### Cloud Dimensions

| Field (ECS)               | OTel Equivalent             | Use Case                     |
| ------------------------- | --------------------------- | ---------------------------- |
| `cloud.provider`          | `cloud.provider` ✓          | Multi-cloud comparison       |
| `cloud.region`            | `cloud.region` ✓            | Identify regional issues     |
| `cloud.availability_zone` | `cloud.availability_zone` ✓ | Identify AZ-specific outages |

#### Error Dimensions

| Field (ECS)  | OTel Equivalent  | Use Case                            |
| ------------ | ---------------- | ----------------------------------- |
| `error.type` | `exception.type` | Categorize errors by exception type |

---

## 6. Documentation Requirements

Each tool should have a concise `README.md`:

- Keep it under 50 lines
- Focus on examples, not implementation details
- Don't duplicate parameter descriptions from the schema
- 2-4 examples covering common use cases

---

## 7. Testing and Development

### File Locations

- Tools: `x-pack/solutions/observability/plugins/observability_agent_builder/server/tools/`
- API Tests: `x-pack/solutions/observability/test/api_integration_deployment_agnostic/apis/observability_agent_builder/tools/`
- Synthtrace Scenarios: `src/platform/packages/shared/kbn-synthtrace/src/scenarios/agent_builder/tools/`

### Synthtrace Scenarios

Every tool MUST have a Synthtrace scenario that generates realistic test data covering:

- Multiple services/entities
- Different environments
- Various dimension values (hosts, containers, pods)
- Success and failure cases
- Edge cases (empty results, high cardinality)

#### Running a Synthtrace Scenario

```bash
node scripts/synthtrace \
  src/platform/packages/shared/kbn-synthtrace/src/scenarios/agent_builder/tools/<tool_name>/<scenario>.ts \
  --from "now-1h" --to "now" --clean --workers=1
```

### Executing Tools Locally

Test your tool directly via the API:

```bash
curl -X POST http://localhost:5601/api/agent_builder/tools/_execute \
  -u elastic:changeme \
  -H 'kbn-xsrf: true' \
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

Write tests that:

1. Use Synthtrace to generate predictable data
2. Execute the tool via the API
3. Assert that the tool produces the expected results

### Allow list

All new tools **must** be added to the Agent Builder allow list to pass CI:

```
x-pack/platform/packages/shared/agent-builder/agent-builder-server/allow_lists.ts
```

### Required Test Coverage

1. **Basic functionality** — Tool returns expected structure
2. **Filtering** — Each filter parameter works correctly
3. **Grouping** — Each supported `groupBy` dimension works (service, transaction, infrastructure)
4. **Edge cases** — Empty results, invalid filters

---

## 8. Pre-Merge Checklist

Before merging a new or updated tool:

- [ ] Tool added to `allow_lists.ts`
- [ ] Description includes "When to use" section
- [ ] Description includes "When NOT to use" with alternatives
- [ ] Works with both ECS and OTel data (where applicable)
- [ ] Metrics normalized (ms for latency, per-minute for rates, 0-1 for failure rate)
- [ ] README with 2-4 usage examples
- [ ] Synthtrace scenario for test data generation
- [ ] API integration tests covering filters, groupBy dimensions, and edge cases

---

## References

- [Elastic Common Schema (ECS)](https://www.elastic.co/docs/reference/ecs/ecs-field-reference)
- [OpenTelemetry Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/)
