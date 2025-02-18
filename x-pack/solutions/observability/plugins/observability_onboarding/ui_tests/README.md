## How to run tests

First start the servers:

```bash
// ESS
node scripts/scout.js start-server --stateful

// Serverless
node scripts/scout.js start-server --serverless=[es|oblt|security]
```

Then you can run the tests in another terminal:

Some tests are designed to run sequentially:

```bash
// ESS
npx playwright test --config x-pack/solutions/observability/plugins/observability_onboarding/ui_tests/playwright.config.ts --grep @ess

// Serverless
npx playwright test --config x-pack/solutions/observability/plugins/observability_onboarding/ui_tests/playwright.config.ts --grep @svlOblt
```

Some tests are designed to run concurrently (preferred option):

```bash
// ESS
npx playwright test --config x-pack/solutions/observability/plugins/observability_onboarding/ui_tests/parallel_playwright.config.ts --grep @ess

// Serverless
npx playwright test --config x-pack/solutions/observability/plugins/observability_onboarding/ui_tests/parallel_playwright.config.ts --grep @svlOblt
```

Test results are available in `x-pack/solutions/observability/plugins/observability_onboarding/ui_tests/output`
