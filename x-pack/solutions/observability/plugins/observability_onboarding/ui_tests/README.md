## How to run tests

First start the servers:

```bash
// ESS
node scripts/scout.js start-server --stateful

// Serverless
node scripts/scout.js start-server --serverless=[es|oblt|security]
```

Then you can run the tests in another terminal:

```bash
// ESS
npx playwright test --config x-pack/solutions/observability/plugins/observability_onboarding/ui_tests/playwright.config.ts --grep @ess

// Serverless
npx playwright test --config x-pack/solutions/observability/plugins/observability_onboarding/ui_tests/playwright.config.ts --grep @svlOblt
```

Test results are available in `x-pack/solutions/observability/plugins/observability_onboarding/ui_tests/output`
