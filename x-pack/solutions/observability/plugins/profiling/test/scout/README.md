## How to run Profiling Scout tests

### Start the Server

```bash
// ESS (recommended for profiling tests)
node scripts/scout.js start-server --arch stateful --domain classic

// Serverless - currently not supported in Universal Profiling
node scripts/scout.js start-server --arch serverless --domain [search|observability_complete|security_complete]
```

### Run the Tests

**Note**: Profiling resources and test data are automatically set up when you run the tests. The global setup hook will:

- Set up profiling Elasticsearch resources via `/api/profiling/setup/es_resources`
- Load test profiling data from 'x-pack/solutions/observability/packages/kbn-scout-oblt/src/playwright/fixtures/worker/profiling/test_data'
- Skip setup if resources and data are already present

Run the parallel tests:

```bash
// ESS
node scripts/playwright test --config x-pack/solutions/observability/plugins/profiling/test/scout/ui/parallel.playwright.config.ts --project=local --grep @local-stateful-classic

```

## Test Categories

Tests are tagged with:

- `@local-stateful-classic` - Stateful tests
- `@local-serverless-observability_complete` - Serverless tests - currently not supported in Universal Profiling

Test results are available in `x-pack/solutions/observability/plugins/profiling/test/scout/ui/output`

## Api Tests Execution Order

While UI tests run in parallel, api tests can't be parallelized as they test different setups that could conflict with one another. To avoid constant setups and cleanups of profiling resources, which can lead to performance issues and flaky tests, api tests must run sequentially and in a predefined order.

This strict ordering will ensure suites testing features for missing setups will run before those requiring partial setups, which in turn run before others requiring full setup and data. Thanks to it, the tests can limit the amount of calls to setup resources and cleanup, instead of having to setup the whole thing in each `beforeAll` as well as having to cleanup in every `afterAll`. The global teardown hook that runs after all suites will ensure cleanup is done before terminating the profiling suite execution ensuring tests cleanup after themselves and do not pollute test lanes when running in one.

By default, playwright runs tests in the order they're discovered when read from the test directory. This is why api test files are prefixed with a given number which indicates the order they're expected to run, being 00\_\* the first test to run. If you're adding a new test, consider your suite's needs in terms of setup and data. If your tests concern features when no setup and/or data is present be sure to run them **before** tests that do configure resources and data. And likewise, if your test is configuring resources or adding data make sure it runs **after** tests that expect empty config or data.
