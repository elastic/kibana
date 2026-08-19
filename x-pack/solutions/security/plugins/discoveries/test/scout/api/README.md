# Discoveries — Scout API Tests

Scout API integration tests for the `discoveries` plugin's internal schedule routes. Ten spec files covering schedule CRUD, lifecycle, RBAC, and the **asymmetric tag-based visibility** invariant introduced in PR 10.

For system context (the four entry points, schedule integration with the Alerting Framework, security surfaces), see the canonical [discoveries plugin README](../../../README.md).

## Scope

These tests verify the seven internal schedule routes added in PR 3 and the schedule isolation guarantees added in PR 10. They do not exercise the orchestrator, the workflow steps, or the LLM connectors — those are covered by Jest unit tests and Workflows-app integration tests respectively.

| Surface | Verified by |
|---------|-------------|
| Internal schedule CRUD (create / find / get / update / delete) | `create.spec.ts`, `find.spec.ts`, `get.spec.ts`, `update.spec.ts`, `delete.spec.ts` |
| Lifecycle (enable / disable) | `enable.spec.ts`, `disable.spec.ts` |
| RBAC (403 for unauthorized users) | `rbac.spec.ts` |
| Tag-based visibility (internal vs public APIs) | `isolation.spec.ts` |
| Scaffold smoke test | `scaffold_verification.spec.ts` (skipped) |

## Asymmetric tag-based visibility invariant

The schedule data client (`createScheduleDataClient`) tags every internal-API-created schedule with `attack-discovery-schedule` (`applyTags`) but intentionally does **not** set a `filterTags` read filter. The public API tags nothing and excludes tagged schedules on read. The result is an **asymmetric** invariant — the internal API is the superset view:

| Caller | Sees |
|--------|------|
| Public-API user (legacy) | Only untagged (public/legacy) schedules — workflow-tagged schedules are excluded |
| Internal-API user (workflows on) | **All** schedules — both its own tagged rules and untagged legacy schedules (migration continuity) |

`isolation.spec.ts` verifies this asymmetry: it creates schedules through both APIs in the same space and asserts (a) the internal API's find returns both its own and public schedules (the superset), and (b) the public API cannot see workflow-tagged schedules (404 on get/delete). The invariant depends on legacy `register_schedule` (in `elastic_assistant`) **never** writing the tag — that's verified in `elastic_assistant`'s tests, not here.

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
npx playwright test --config x-pack/solutions/security/plugins/discoveries/test/scout/api/playwright.config.ts --project=local isolation.spec.ts
```

## Test Structure

```
test/scout/api/
├── playwright.config.ts              # Scout Playwright configuration
├── README.md                         # This file
├── fixtures/
│   ├── constants.ts                  # Route paths, headers, ATTACK_DISCOVERY_SCHEDULE_TAG
│   └── helpers.ts                    # API wrappers, mock data, cleanup utilities
└── tests/
    ├── scaffold_verification.spec.ts # Scaffold smoke test (skipped)
    ├── create.spec.ts                # CRUD: create schedule
    ├── get.spec.ts                   # CRUD: get schedule by id
    ├── find.spec.ts                  # CRUD: find/list schedules (pagination, sorting)
    ├── update.spec.ts                # CRUD: update schedule
    ├── delete.spec.ts                # CRUD: delete schedule
    ├── enable.spec.ts                # Lifecycle: enable schedule + 404 handling
    ├── disable.spec.ts               # Lifecycle: disable schedule + 404 handling
    ├── rbac.spec.ts                  # RBAC: 403 for viewer (unauthorized) on writes
    └── isolation.spec.ts             # Asymmetric tag-based API visibility
```

## Test taxonomy

| Spec | One-liner |
|------|-----------|
| `create.spec.ts` | Happy path, defaults, validation errors; asserts `attack-discovery-schedule` tag is applied |
| `get.spec.ts` | 200 for owner, 404 for missing id |
| `find.spec.ts` | Returns all created schedules; pagination and sorting |
| `update.spec.ts` | Partial updates; tag preserved across updates |
| `delete.spec.ts` | 200 with `{ id }` on success, 404 on missing id |
| `enable.spec.ts` | Disabled → enabled state transition; 404 on missing id |
| `disable.spec.ts` | Enabled → disabled state transition; 404 on missing id |
| `rbac.spec.ts` | 403 for viewer (unauthorized) on every write op (`create`, `update`, `delete`, `enable`, `disable`) |
| `isolation.spec.ts` | Asymmetric tag invariant: internal API is the superset view; public API excludes tagged schedules |
| `scaffold_verification.spec.ts` | Skipped scaffold smoke test (kept as a template for new specs) |

## Test Utilities

| Utility | Purpose |
|---------|---------|
| `getSimpleWorkflowSchedule()` | Returns a minimal valid internal schedule body |
| `getSimplePublicSchedule()` | Returns a minimal valid public schedule body |
| `getWorkflowSchedulesApis()` | Wraps all 7 internal schedule routes with auth headers |
| `getPublicSchedulesApis()` | Wraps public schedule routes with auth and version headers |
| `enableWorkflowSchedulesFeature()` | Enables the `securitySolution:securityAttackDiscoverySchedulesEnabled` advanced (UI) setting so the internal schedule routes are reachable |
| `deleteAllWorkflowSchedules()` | Cleans up all internal schedules for test isolation |
| `deleteAllPublicSchedules()` | Cleans up all public schedules for test isolation |

## Adding a new test

1. **Pick the right file.** If your test exercises a single route, extend the existing spec for that route. If it spans multiple routes (e.g., another isolation invariant), add a new spec.
2. **Use the fixtures.** `getSimpleWorkflowSchedule()` and `getSimplePublicSchedule()` give you valid bodies; mutate them with the spread operator instead of constructing from scratch.
3. **Auth context.** Most specs run as a privileged user. For RBAC tests, swap the auth header to a viewer (see `rbac.spec.ts` for the pattern).
4. **Cleanup.** Call `deleteAllWorkflowSchedules()` and `deleteAllPublicSchedules()` in `afterEach` so cross-test state doesn't bleed.
5. **Tag assertion.** If you create a schedule via the internal API, assert that the response carries `tags: ['attack-discovery-schedule']`. If via the public API, assert the tag is NOT present.
6. **Single assertion focus.** Per `jest-testing.md` (also applied here), each test should focus on one assertion per behavior — easier to diagnose when one fails.

## CI

These tests run in Buildkite. The command in CI matches the local invocation:

```sh
node scripts/scout.js start-server --location local --arch stateful --domain classic
npx playwright test --config x-pack/solutions/security/plugins/discoveries/test/scout/api/playwright.config.ts --project=local
```

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| All specs return 404 | `securitySolution:securityAttackDiscoverySchedulesEnabled` advanced setting not enabled in the Scout server | Confirm `enableWorkflowSchedulesFeature()` ran in the test setup |
| `isolation.spec.ts` flaky | Cleanup didn't drain both APIs between tests | Run `deleteAllWorkflowSchedules()` AND `deleteAllPublicSchedules()` in `afterEach` |
| Tag missing on schedule create | Internal API short-circuited before the data client applied the tag | Verify the route went through `createScheduleDataClient` with `applyTags: [ATTACK_DISCOVERY_SCHEDULE_TAG]` |
| RBAC test passes a write that should 403 | Viewer role mis-mapped or the advanced setting is off | Check the role used by the test fixture; check the `securitySolution:securityAttackDiscoverySchedulesEnabled` setting state |
| Connector flake | LLM connector not configured in the Scout image | The schedule API tests don't invoke the LLM — but a misconfigured connector can break unrelated steps in the same workflow. Confirm the test's `apiConfig.connectorId` points at a valid mock connector |
| Local dev server still running | Stale ES/Kibana ports collide with Scout | Stop your `yarn es` / `yarn start` dev servers before running Scout |
