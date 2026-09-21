# Scout tests for `serverless_vectordb`

The Vector DB project type only exists on serverless, so every suite here is tagged
`tags.serverless.vectordb` and there is no stateful counterpart.

- `ui/parallel_tests` covers the onboarding wizard (both embedding paths), the home page, and how
  both differ between a privileged user and a viewer.
- `api/tests` covers the plugin's internal routes: deployment stats, the onboarding API key, and
  the starred dashboards count.

## How to run

Start the servers once:

```bash
node scripts/scout.js start-server --arch serverless --domain vectordb
```

Then run either suite against them:

```bash
node scripts/playwright test --project local --grep @local-serverless-vectordb \
  --config x-pack/solutions/vectordb/plugins/serverless_vectordb/test/scout/ui/parallel.playwright.config.ts

node scripts/playwright test --project local --grep @local-serverless-vectordb \
  --config x-pack/solutions/vectordb/plugins/serverless_vectordb/test/scout/api/playwright.config.ts
```

To boot the stack and run a suite in one step, use `node scripts/scout.js run-tests --arch
serverless --domain vectordb --config <config>` instead.

Reports and artifacts are written to `<suite>/.scout/`.
