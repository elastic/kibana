# Observability Agent Builder

**Audience**: LLM coding agents working on the Observability Agent Builder plugin.

The Observability Agent Builder plugin provides LLM-powered tools and insights for Site Reliability Engineers (SREs) investigating incidents. It exposes Observability data (logs, metrics, traces) to LLM agents and delivers one-click AI-generated summaries in the Kibana UI.

---

## Domain-Specific Guides

- **[Development Guide](./server/AGENTS.md)** (`server/AGENTS.md`) — Design principles, ECS/OTel compatibility, APM data types, parameter conventions, testing workflows, and the pre-merge checklist.

- **[Data Ingestion](./DATA_INGESTION.md)** (`DATA_INGESTION.md`) — How to ingest observability data into Elasticsearch: ingestion scripts (RCAEval, OpenRCA), Synthtrace scenarios, and the OpenTelemetry Demo.

- **[AI Insights](./server/routes/ai_insights/AGENTS.md)** (`server/routes/ai_insights/AGENTS.md`) — Architecture of one-click AI Insights (prefetched context, hardcoded prompts), prompt design, UI integration, conversation handoff, and testing.

- **[API Integration Tests](../../test/api_integration_deployment_agnostic/apis/observability_agent_builder/AGENTS.md)** (`x-pack/solutions/observability/test/api_integration_deployment_agnostic/apis/observability_agent_builder/AGENTS.md`) — How to run API integration tests, test structure guidelines, and shared utilities.

- **[Synthtrace Scenarios](../../../../../src/platform/packages/shared/kbn-synthtrace/src/scenarios/agent_builder/AGENTS.md)** (`src/platform/packages/shared/kbn-synthtrace/src/scenarios/agent_builder/AGENTS.md`) — How to generate synthetic test data for tools and AI Insights using Synthtrace scenarios.
