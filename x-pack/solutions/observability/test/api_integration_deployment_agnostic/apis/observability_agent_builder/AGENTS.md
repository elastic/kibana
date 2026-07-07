# API Integration Tests for Observability Agent Builder

**Audience**: LLM coding agents working on API integration tests for Agent Builder tools and AI Insights.

> **See also**: [Tool Development Guidelines](../../../../plugins/observability_agent_builder/server/tools/AGENTS.md) for tool design principles, APM data types, and ECS/OTel compatibility.

## Running Tests

```bash
node scripts/functional_test_runner \
  --config x-pack/solutions/observability/test/api_integration_deployment_agnostic/configs/stateful/oblt.ai_agent.stateful.config.ts
```

### Running tests for a specific tool:

```bash
node scripts/functional_test_runner \
  --config x-pack/solutions/observability/test/api_integration_deployment_agnostic/configs/stateful/oblt.ai_agent.stateful.config.ts \
  --grep="<tool_name>"
```

## Test Structure Guidelines

- **Single expectation per `it`** — Each test should verify one logical assertion. Multiple `expect()` calls are allowed if they test the same logical thing (e.g., verifying all items in an array have a property).

- **Use tool ID in describe name** — `describe(\`tool: ${OBSERVABILITY_GET_*_TOOL_ID}\`, ...)`

- **Use shared API client** — `createAgentBuilderApiClient(scoped)` from `../utils/agent_builder_client`

- **Use Synthtrace for test data** — Use generators from `@kbn/synthtrace`