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
npx playwright test --config x-pack/solutions/observability/plugins/profiling/test/scout/ui/parallel.playwright.config.ts --project=local --grep @local-stateful-classic

```

## Test Categories

Tests are tagged with:
- `@local-stateful-classic` - Stateful tests
- `@local-serverless-observability_complete` - Serverless tests - currently not supported in Universal Profiling

Test results are available in `x-pack/solutions/observability/plugins/profiling/test/scout/ui/output`
