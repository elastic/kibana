# Profiling E2E tests

Profiling uses [FTR](../../../../../../packages/kbn-test/README.mdx) (functional test runner) and [Cypress](https://www.cypress.io/) to run the e2e tests. The tests are located at `kibana/x-pack/solutions/observability/plugins/profiling/e2e/cypress/e2e`.

## E2E Tests (Cypress)

The E2E tests are located in [`x-pack/solutions/observability/plugins/profiling/e2e`](../e2e).

Tests run on buildkite PR pipeline are parallelized (4 parallel jobs) and are orchestrated by the Cypress dashboard service. It can be configured in [.buildkite/pipelines/pull_request/profiling_cypress.yml](https://github.com/elastic/kibana/blob/main/.buildkite/pipelines/pull_request/profiling_cypress.yml) with the property `parallelism`.

```yml
    ...
    depends_on: build
    parallelism: 3
    ...
```

## Running it locally

### Start with Cypress Dashboard

```
node x-pack/solutions/observability/plugins/profiling/scripts/test/e2e --open
```

### Run tests
Runs all tests in the terminal

```
node x-pack/solutions/observability/plugins/profiling/scripts/test/e2e
```

### Run tests in headed mode

```
node x-pack/solutions/observability/plugins/profiling/scripts/test/e2e --headed
```

### Arguments

| Option       | Description                                     |
| ------------ | ----------------------------------------------- |
| --open       | Opens Cypress dashboard                         |
| --headed     | Runs tests in headed mode                       |

