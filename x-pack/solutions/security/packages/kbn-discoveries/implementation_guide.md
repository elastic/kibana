# Implementation Guide for Graph Invocation

> **Note:** The `POST /internal/attack_discovery/_generate/graph` endpoint and its supporting code (`executeGraphGeneration`, `PostGenerateGraphRequestBody`, etc.) have been removed. The generation graph is now invoked exclusively through the orchestrated pipeline (`POST /internal/attack_discovery/_generate`) via workflow steps.

## Current Architecture

The `@kbn/discoveries` package defines type-safe interfaces for invoking Attack Discovery and Defend Insights graphs with pre-retrieved documents:
- `InvokeAttackDiscoveryGraphWithDocs` - for Attack Discovery
- `InvokeDefendInsightsGraphWithDocs` - for Defend Insights

These interfaces are used by the `attack-discovery.generate` workflow step, which is orchestrated by the `_generate` endpoint's pipeline.

## Integration Pattern

The `discoveries` plugin invokes graph generation through the workflow engine:

1. `POST /internal/attack_discovery/_generate` validates the request and kicks off the orchestrated pipeline
2. The pipeline runs alert retrieval, generation, and validation as separate workflow steps
3. The `attack-discovery.generate` step uses `invokeAttackDiscoveryGraphWithAlerts` from `@kbn/discoveries`
4. Results are persisted by the validation step

## Testing Strategy

1. **Unit tests**: Mock the graph invocation and verify documents are passed correctly
2. **Integration test**: Run actual workflow with the orchestrated pipeline and verify:
   - Alert retrieval step produces alerts
   - Generation step produces discoveries
   - Validation step persists results
