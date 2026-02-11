## How to run tests

First start the servers:

```bash
// ESS
node scripts/scout.js start-server --stateful

// Serverless
node scripts/scout.js start-server --serverless=[es|oblt|oblt-logs-essentials|security]
```

Then you can run the tests in another terminal:

Some tests are designed to run sequentially:

```bash
// ESS
npx playwright test --config x-pack/solutions/observability/plugins/observability_onboarding/test/scout/ui/playwright.config.ts --project=local --grep @ess

// Serverless
npx playwright test --config x-pack/solutions/observability/plugins/observability_onboarding/test/scout/ui/playwright.config.ts --project=local --grep @svlOblt

// Serverless Logs-Essentials
npx playwright test --config x-pack/solutions/observability/plugins/observability_onboarding/test/scout/ui/playwright.config.ts --project=local --grep @svlLogsEssentials
```

Some tests are designed to run concurrently (preferred option):

```bash
// ESS
npx playwright test --config x-pack/solutions/observability/plugins/observability_onboarding/test/scout/ui/parallel.playwright.config.ts --project=local --grep @ess

// Serverless
npx playwright test --config x-pack/solutions/observability/plugins/observability_onboarding/test/scout/ui/parallel.playwright.config.ts --project=local --grep @svlOblt

// Serverless Logs-Essentials
npx playwright test --config x-pack/solutions/observability/plugins/observability_onboarding/test/scout/ui/parallel.playwright.config.ts --project=local --grep @svlLogsEssentials
```

You can also run tests in UI mode by passing the `--ui` flag to the test command:

```
npx playwright test --ui --config x-pack/solutions/observability/plugins/observability_onboarding/test/scout/ui/playwright.config.ts --project=local --grep @ess
```

Test results are available in `x-pack/solutions/observability/plugins/observability_onboarding/test/scout/ui/output`
