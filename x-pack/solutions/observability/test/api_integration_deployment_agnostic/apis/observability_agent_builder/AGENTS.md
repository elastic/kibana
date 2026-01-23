# API Integration Tests for Observability Agent Builder

## Test Structure Guidelines

- **Single expectation per `it`** — Each test should verify one logical assertion. Multiple `expect()` calls are allowed if they test the same logical thing (e.g., verifying all items in an array have a property).

- **Use tool ID in describe name** — `describe(\`tool: ${OBSERVABILITY_GET_*_TOOL_ID}\`, ...)`

- **Use shared API client** — `createAgentBuilderApiClient(scoped)` from `../utils/agent_builder_client`

- **Use Synthtrace for test data** — Use generators from `@kbn/synthtrace`