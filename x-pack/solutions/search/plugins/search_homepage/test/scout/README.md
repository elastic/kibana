## How to run tests

First start the servers:

```bash
// ESS
node scripts/scout.js start-server --arch stateful --domain classic

// Serverless
node scripts/scout.js start-server --arch serverless --domain search
```

Then you can run the parallel tests in another terminal:

```bash
// ESS
npx playwright test --config x-pack/solutions/search/plugins/search_homepage/test/scout/ui/playwright.config.ts --project=local --grep stateful-classic

// Serverless
npx playwright test --project local --config x-pack/solutions/search/plugins/search_homepage/test/scout/ui/playwright.config.ts --grep serverless-search
```

Test results are available in `x-pack/solutions/search/plugins/search_homepage/test/scout/ui/output`
