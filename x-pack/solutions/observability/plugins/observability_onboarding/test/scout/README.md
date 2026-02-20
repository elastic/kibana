## How to run tests

First start the servers:

```bash
// ESS
node scripts/scout.js start-server --arch stateful --domain classic

// Serverless
node scripts/scout.js start-server --arch serverless --domain [search|observability_complete|observability_logs_essentials|security_complete|security_essentials|security_ease]
```

Then you can run the tests in another terminal:

Some tests are designed to run sequentially:

```bash
// ESS
npx playwright test --config x-pack/solutions/observability/plugins/observability_onboarding/test/scout/ui/playwright.config.ts --project=local --grep stateful-classic

// Serverless
npx playwright test --config x-pack/solutions/observability/plugins/observability_onboarding/test/scout/ui/playwright.config.ts --project=local --grep serverless-observability_complete

// Serverless Logs-Essentials
npx playwright test --config x-pack/solutions/observability/plugins/observability_onboarding/test/scout/ui/playwright.config.ts --project=local --grep serverless-observability_logs_essentials
```

Some tests are designed to run concurrently (preferred option):

```bash
// ESS
npx playwright test --config x-pack/solutions/observability/plugins/observability_onboarding/test/scout/ui/parallel.playwright.config.ts --project=local --grep stateful-classic

// Serverless
npx playwright test --config x-pack/solutions/observability/plugins/observability_onboarding/test/scout/ui/parallel.playwright.config.ts --project=local --grep serverless-observability_complete

// Serverless Logs-Essentials
npx playwright test --config x-pack/solutions/observability/plugins/observability_onboarding/test/scout/ui/parallel.playwright.config.ts --project=local --grep serverless-observability_logs_essentials
```

You can also run tests in UI mode by passing the `--ui` flag to the test command:

```
npx playwright test --ui --config x-pack/solutions/observability/plugins/observability_onboarding/test/scout/ui/playwright.config.ts --project=local --grep stateful-classic
```

Test results are available in `x-pack/solutions/observability/plugins/observability_onboarding/test/scout/ui/output`
