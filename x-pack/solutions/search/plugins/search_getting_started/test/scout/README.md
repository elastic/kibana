## How to run tests

First start the servers:

```bash
// ESS
node scripts/scout.js start-server --stateful

// Serverless
node scripts/scout.js start-server --serverless=es
```

Then you can run the parallel tests in another terminal:

```bash
// ESS
npx playwright test --config x-pack/solutions/search/plugins/search_getting_started/test/scout/ui/parallel.playwright.config.ts --project=local --grep @ess

// Serverless
npx playwright test --project local --config x-pack/solutions/search/plugins/search_getting_started/test/scout/ui/parallel.playwright.config.ts --grep @svlSearch
```

Test results are available in `x-pack/solutions/search/plugins/search_getting_started/test/scout/ui/output`
