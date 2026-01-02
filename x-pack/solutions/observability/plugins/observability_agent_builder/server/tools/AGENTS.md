# Best Practices for Observability Tools

This document defines best practices for implementing Observability tools in Kibana Agent Builder. These tools are optimized for LLM use in incident investigation scenarios where Site Reliability Engineers (SREs) need to quickly understand what happened and how to fix it.

---

## SRE Incident Investigation Workflow

Understanding how SREs investigate incidents is essential for designing effective tools. The LLM acts as an intelligent assistant that helps SREs answer critical questions faster.

### The Questions SREs Ask

During incident investigation, SREs follow a mental model of progressive diagnosis:

| Phase           | Questions                                                                |
| --------------- | ------------------------------------------------------------------------ |
| **Detection**   | Is something wrong? What alerts fired? What's the current system health? |
| **Scope**       | What services/hosts are affected? How widespread is the impact?          |
| **Timeline**    | When did it start? What changed around that time?                        |
| **Correlation** | What errors preceded this? What's the sequence of events?                |
| **Root Cause**  | Why did this happen? What's the underlying issue?                        |
| **Resolution**  | How do I fix it? Has this happened before?                               |

Each tool should clearly map to one or more of these investigation phases.

---

## Design Principles

### LLM Optimization

1. **Self-documenting for tool selection** — Tool descriptions should enable LLMs to choose the right tool and use it correctly.
2. **Structured for summarization** — Output should be easy for LLMs to extract insights and present them in natural language.
3. **Progressive disclosure** — Return high-level summaries first; detailed data for deeper investigation.

### Tool Design

4. **Answer specific questions** — A tool that tries to answer too many questions becomes confusing for the LLM to select.
5. **Minimal required parameters** — Common use cases should require zero or one parameter.
6. **Cross-tool navigation** — Tool output should enable the LLM to suggest related tools (e.g., after `get_alerts`, suggest `get_correlated_logs`).

### Data & Implementation

7. **Noise reduction** — Filter out irrelevant data; return only what's useful for incident investigation.
8. **ECS and OTel compatible** — Tools must work with both Elastic Common Schema and OpenTelemetry data formats.
9. **Guard rails** — Use concurrency limits (e.g., `p-limit`) and result caps to avoid overloading Elasticsearch.
10. **Simple implementation** — Code should be maintainable, easy to read, and avoid unnecessary complexity.

---

## 1. File Structure

Every tool should follow this directory structure:

```
tool_name/
├── tool.ts           # Tool definition: ID, schema, description, handler wrapper
├── handler.ts        # Core business logic (separated for testability)
├── README.md         # Usage examples
└── <sub-feature>.ts  # Optional: complex logic broken into sub-modules
```

---

## 2. Tool Registration

### Allow List

All new tools **must** be added to the Agent Builder allow list to pass CI:

```
x-pack/platform/packages/shared/agent-builder/agent-builder-server/allow_lists.ts
```

---

## 3. Tool Description

The LLM selects tools based solely on the description and parameter schema. Poor descriptions lead to wrong tool selection.

### Structure

Every tool description should follow this structure:

```
<One-sentence summary of what the tool does>

When to use:
- <Use case 1>
- <Use case 2>
- <Use case 3>

[Optional: How it works (if non-obvious)]

[Optional: Do NOT use for (to prevent misuse)]
```

### Rules

- First sentence should be action-oriented: "Retrieves...", "Identifies...", "Analyzes..."
- Include "When to use" with 2-4 concrete scenarios
- Reference alternative tools when appropriate to guide LLM selection
- Avoid implementation details in the description

---

## 4. Parameter Naming

### Standard Parameter Names

| Category     | Parameter      | Notes                                            |
| ------------ | -------------- | ------------------------------------------------ |
| **Filters**  |                |                                                  |
| KQL filter   | `kqlFilter`    | Explicit format; not `query`, `filter`, or `kql` |
| DSL filter   | `dslFilter`    | Raw Elasticsearch DSL object                     |
| **Time**     |                |                                                  |
| Time range   | `start`, `end` | Elasticsearch date math (e.g., `now-1h`)         |
| **Entities** |                |                                                  |
| Service      | `serviceName`  | Maps to `service.name` (ECS/OTel)                |
| Host         | `hostName`     | Maps to `host.name`                              |

---

## 5. Summary Field

Every tool **must** return a `summary` field — a single sentence the LLM can use directly in its response.

### Rules

- Include context when helpful: `Found 3 downstream dependency(s) for payment-service.`
- For empty results, explain why or suggest next steps
- Keep it under 100 characters

---

## 6. ECS and OTel Compatibility

Tools must work with both [ECS (Elastic Common Schema)](https://www.elastic.co/docs/reference/ecs/ecs-field-reference) and [OTel (OpenTelemetry Semantic Conventions)](https://opentelemetry.io/docs/specs/semconv/) data.

### Common Field Mappings

When querying or filtering, check **both** ECS and OTel field variants:

| Concept         | ECS                         | OTel                                 |
| --------------- | --------------------------- | ------------------------------------ |
| Log message     | `message`                   | `Body`                               |
| Log level       | `log.level`                 | `SeverityText`, `SeverityNumber`     |
| Trace ID        | `trace.id`                  | `trace_id`, `TraceId`                |
| Span ID         | `span.id`                   | `span_id`, `SpanId`                  |
| Service name    | `service.name`              | `service.name` ✓ (same)              |
| Service version | `service.version`           | `service.version` ✓ (same)           |
| Environment     | `service.environment`       | `deployment.environment`             |
| Host name       | `host.name`                 | `host.name` ✓ (same)                 |
| HTTP status     | `http.response.status_code` | `http.response.status_code` ✓ (same) |
| HTTP method     | `http.request.method`       | `http.request.method` ✓ (same)       |

---

## 7. Documentation (README)

Each tool should have a concise `README.md`:

### Rules

- Keep it under 50 lines
- Focus on examples, not implementation details
- Don't duplicate parameter descriptions from the schema
- 2-4 examples covering common use cases

---

## 8. Testing and Development

### File Locations

```
Tools:     x-pack/solutions/observability/plugins/observability_agent_builder/server/tools/
Tests:     x-pack/solutions/observability/test/api_integration_deployment_agnostic/apis/observability_agent_builder/tools/
Scenarios: src/platform/packages/shared/kbn-synthtrace/src/scenarios/agent_builder/tools/
```

### Synthtrace for Test Data Generation

Every tool should have a Synthtrace scenario that generates realistic test data. This makes it possible to easily test out hand-crafted scenarios, and ensure the tool supports them. Scenarios can be run manually using the CLI or as part of automated testing.

#### Running a Synthtrace Scenario using the CLI

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

### API Integration Tests

Write tests that:

1. Use Synthtrace to generate predictable data
2. Execute the tool via the API
3. Assert that the tool produces the expected results

---

## Checklist

Before merging a new tool:

- [ ] Tool added to `allow_lists.ts`
- [ ] Description includes "When to use" section
- [ ] Handler returns a `summary` field
- [ ] Works with both ECS and OTel data
- [ ] README with usage examples
- [ ] Synthtrace scenario for test data generation
- [ ] API integration tests
