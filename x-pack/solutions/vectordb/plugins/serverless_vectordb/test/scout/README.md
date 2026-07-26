# Scout tests for serverless_vectordb

The Vector DB plugin only runs in serverless Vector DB projects, so all suites are
tagged with `tags.serverless.vectordb` and run against `--arch serverless --domain vectordb`.

## How to run tests

Run everything with managed servers:

```bash
# UI (parallel)
node scripts/scout.js run-tests --arch serverless --domain vectordb --config x-pack/solutions/vectordb/plugins/serverless_vectordb/test/scout/ui/parallel.playwright.config.ts

# API
node scripts/scout.js run-tests --arch serverless --domain vectordb --config x-pack/solutions/vectordb/plugins/serverless_vectordb/test/scout/api/playwright.config.ts
```

For faster iteration, start the servers once:

```bash
node scripts/scout.js start-server --arch serverless --domain vectordb
```

Then run Playwright directly in another terminal:

```bash
# UI (parallel)
node scripts/playwright test --project local --config x-pack/solutions/vectordb/plugins/serverless_vectordb/test/scout/ui/parallel.playwright.config.ts

# API
node scripts/playwright test --project local --config x-pack/solutions/vectordb/plugins/serverless_vectordb/test/scout/api/playwright.config.ts
```

Test results are available in `x-pack/solutions/vectordb/plugins/serverless_vectordb/test/scout/{ui,api}/output`.
