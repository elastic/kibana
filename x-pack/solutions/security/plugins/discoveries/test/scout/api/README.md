# Discoveries — Scout API Tests

Scout API integration tests for the `discoveries` plugin's internal schedule routes. Eight spec files covering schedule CRUD, lifecycle and RBAC.

For system context (the four entry points, schedule integration with the Alerting Framework, security surfaces), see the canonical [discoveries plugin README](../../../README.md).

## Scope

These tests verify the seven internal schedule routes. They do not exercise the orchestrator, the workflow steps, or the LLM connectors — those are covered by Jest unit tests and Workflows-app integration tests respectively.

| Surface                                                        | Verified by                                                                         |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Internal schedule CRUD (create / find / get / update / delete) | `create.spec.ts`, `find.spec.ts`, `get.spec.ts`, `update.spec.ts`, `delete.spec.ts` |
| Lifecycle (enable / disable)                                   | `enable.spec.ts`, `disable.spec.ts`                                                 |
| RBAC (403 for unauthorized users)                              | `rbac.spec.ts`                                                                      |

## Prerequisites

Stop any locally running Elasticsearch and Kibana instances before starting the Scout server.

## Running

### Start the server (stateful)

```sh
node scripts/scout.js start-server --location local --arch stateful --domain classic
```

### Or serverless (security complete)

```sh
node scripts/scout.js start-server --location local --arch serverless --domain security_complete
```

### Run the tests

```sh
npx playwright test --config x-pack/solutions/security/plugins/discoveries/test/scout/api/playwright.config.ts --project=local
```

To run a single spec:

```sh
node scripts/playwright test --config x-pack/solutions/security/plugins/discoveries/test/scout/api/playwright.config.ts --project=local find.spec.ts
```

## Test Structure

```
test/scout/api/
├── playwright.config.ts              # Scout Playwright configuration
├── README.md                         # This file
├── fixtures/
│   ├── constants.ts                  # Route paths, headers, feature flag and setting keys
│   ├── helpers.ts                    # API wrappers, mock data, cleanup utilities
│   └── index.ts                      # `apiTest` with the generated clients and the `scheduleSpace` fixture
└── tests/
    ├── create.spec.ts                # CRUD: create schedule
    ├── get.spec.ts                   # CRUD: get schedule by id
    ├── find.spec.ts                  # CRUD: find/list schedules (pagination, sorting)
    ├── update.spec.ts                # CRUD: update schedule
    ├── delete.spec.ts                # CRUD: delete schedule
    ├── enable.spec.ts                # Lifecycle: enable schedule + 404 handling
    ├── disable.spec.ts               # Lifecycle: disable schedule + 404 handling
    ├── rbac.spec.ts                  # RBAC: 403 for viewer (unauthorized) on writes
    ├── global.setup.ts               # Enables the workflows feature flag once per run
    └── global.teardown.ts            # Reverts the feature flag
```

## Test taxonomy

| Spec              | One-liner                                                                                           |
| ----------------- | --------------------------------------------------------------------------------------------------- |
| `create.spec.ts`  | Happy path, defaults, validation errors; asserts `attack-discovery-schedule` tag is applied         |
| `get.spec.ts`     | 200 for owner, 404 for missing id                                                                   |
| `find.spec.ts`    | Returns all created schedules; pagination and sorting                                               |
| `update.spec.ts`  | Partial updates; tag preserved across updates                                                       |
| `delete.spec.ts`  | 200 with `{ id }` on success, 404 on missing id                                                     |
| `enable.spec.ts`  | Disabled → enabled state transition; 404 on missing id                                              |
| `disable.spec.ts` | Enabled → disabled state transition; 404 on missing id                                              |
| `rbac.spec.ts`    | 403 for viewer (unauthorized) on every write op (`create`, `update`, `delete`, `enable`, `disable`) |

## Test Utilities

| Utility                         | Purpose                                                                                                                                                                                                  |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getSimpleWorkflowSchedule()`   | Returns a minimal valid internal schedule body                                                                                                                                                           |
| `getWorkflowSchedulesApis()`    | Wraps all 7 internal schedule routes with auth headers                                                                                                                                                   |
| `enableWorkflowsFeatureFlag()`  | Enables the process-wide `securitySolution.attackDiscoveryWorkflowsEnabled` feature flag; called once from `tests/global.setup.ts`                                                                       |
| `disableWorkflowsFeatureFlag()` | Reverts `enableWorkflowsFeatureFlag()`; called once from `tests/global.teardown.ts`                                                                                                                      |
| `scheduleSpace` fixture         | Per-worker Kibana space with the `securitySolution:enableAttackDiscoveryWorkflows` advanced setting enabled; every spec creates, lists and deletes schedules in it so cleanup never touches other suites |
| `deleteAllWorkflowSchedules()`  | Deletes every schedule in the worker's `scheduleSpace`; fails on unexpected HTTP statuses                                                                                                                |

## Adding a new test

1. **Pick the right file.** If your test exercises a single route, extend the existing spec for that route. If it spans multiple routes, add a new spec.
2. **Use the fixtures.** `getSimpleWorkflowSchedule()` gives you a valid body; mutate them with the spread operator instead of constructing from scratch.
3. **Auth context.** Most specs run as a privileged user. For RBAC tests, swap the auth header to a viewer (see `rbac.spec.ts` for the pattern).
4. **Cleanup.** Call `deleteAllWorkflowSchedules()` in `afterEach` so cross-test state doesn't bleed.
5. **Single assertion focus.** Per `jest-testing.md` (also applied here), each test should focus on one assertion per behavior — easier to diagnose when one fails.

## CI

These tests run in Buildkite. The command in CI matches the local invocation:

```sh
node scripts/scout.js start-server --location local --arch stateful --domain classic
npx playwright test --config x-pack/solutions/security/plugins/discoveries/test/scout/api/playwright.config.ts --project=local
```

## Troubleshooting

| Symptom                                  | Likely cause                                                                                                       | Fix                                                                                                                                                                                                     |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| All specs return 404                     | Feature flag or `securitySolution:enableAttackDiscoveryWorkflows` advanced setting not enabled in the Scout server | Confirm the `setup-*` project ran `tests/global.setup.ts` and the `scheduleSpace` fixture enabled the setting in its space                                                                              |
| RBAC test passes a write that should 403 | Viewer role mis-mapped                                                                                             | Check the role used by the test fixture                                                                                                                                                                 |
| Connector flake                          | LLM connector not configured in the Scout image                                                                    | The schedule API tests don't invoke the LLM — but a misconfigured connector can break unrelated steps in the same workflow. Confirm the test's `apiConfig.connectorId` points at a valid mock connector |
| Local dev server still running           | Stale ES/Kibana ports collide with Scout                                                                           | Stop your `pnpm es` / `pnpm start` dev servers before running Scout                                                                                                                                     |
