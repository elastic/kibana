## How to run Profiling Scout tests

### Step 1: Start the Server

```bash
// ESS (recommended for profiling tests)
node scripts/scout.js start-server --stateful

// Serverless
node scripts/scout.js start-server --serverless=[es|oblt|security]
```

### Step 2: Run the Tests

**Note**: Profiling resources and test data are automatically set up when you run the tests. The global setup hook will:
- Set up profiling Elasticsearch resources via `/api/profiling/setup/es_resources`
- Load 13,208 profiling test documents from Cypress fixtures
- Skip setup if resources and data are already present

Run the parallel tests:

```bash
// ESS
npx playwright test --config x-pack/solutions/observability/plugins/profiling/test/scout/ui/parallel.playwright.config.ts --project=local --grep @ess

// Serverless
npx playwright test --project local --config x-pack/solutions/observability/plugins/profiling/test/scout/ui/parallel.playwright.config.ts --grep @svlOblt
```

## Integrated Setup

Profiling is now fully integrated into the scout-oblt infrastructure, similar to how APM uses synthtrace fixtures:

- **Native Integration** - Profiling setup is part of the core scout-oblt fixtures
- **Automatic Resource Setup** - Sets up profiling Elasticsearch resources via the `/api/profiling/setup/es_resources` endpoint
- **Automatic Data Loading** - Loads test profiling data from the Cypress test fixtures (13,208 documents)
- **Smart Caching** - Skips setup if resources and data are already present
- **CI Ready** - Works seamlessly in CI environments without manual intervention
- **Serverless Ready** - Will automatically work when profiling is supported in serverless environments

This follows the same pattern as APM's synthtrace integration and ensures profiling tests work with actual data instead of just showing the setup page.


## Test Categories

Tests are tagged with:
- `@ess` - Elasticsearch Service tests
- `@svlOblt` - Serverless Observability tests

Test results are available in `x-pack/solutions/observability/plugins/profiling/test/scout/ui/output`
