# ⚠️ @kbn/scout-security IS NOT PRODUCTION READY, SO PLEASE DON'T USE YET

`kbn/scout-security` is a test library that extends [`kbn/scout`](https://github.com/elastic/kibana/blob/main/src/platform/packages/shared/kbn-scout/README.md) with test helpers specifically designed for `Security Solution` features in Kibana.

Its primary goal is to simplify the test development experience for teams working on `Security Solution` plugins by providing custom Playwright fixtures, page objects, and utilities tailored for Security Solution related testing scenarios.

### Table of Contents

1. Overview
2. Folder Structure
3. Config
4. Fixtures
5. Page Objects
6. Starting Servers Onlu
7. Running Servers and Tests
8. Running Tests Separately
9. Adding A New Test
10. Adding Page Objects
11. Adding Fixtures
12. Best Practices

### Overview

`kbn-scout-security` extends from `kbn-scout` framework providing the same advantages:

- **Ease of integration:** a simplified mechanism to write and run tests closer to plugins.
- **Deployment-agnostic tests:** enables the testing of Kibana features across different environments (e.g., Stateful, Serverless).
- **Fixture-based design:** built on Playwright's fixture model to modularize and standardize test setup.
- **Focus on Developer Productivity:** faster test execution and minimal boilerplate for writing tests.

### Folder Structure

The `@kbn/scout-security` structure includes the following key directories and files:

```
x-pack/solutions/security/packages/kbn-scout-security/
├── src/
│   ├── playwright/
│   │   └── constants/
│   │   └── fixtures/
│   │   │   └── test/
│   │   │   │   └── // Security Solution test-scope fixtures
|   |   |   |   └── page_objects/
|   |   |   |       └── // Security Solution pages that can be reused through the different plugins
│   │   │   └── worker/
│   │   │   │   └── // Security Solution worker-scope fixtures
│   │   │   └── single_thread_fixtures.ts
│   │   │   └── parallel_run_fixtures.ts
│   │   │   └── index.ts
|   |   |   └── types.ts
│   └── index.ts
├── README.mk
├── index.ts
├── jest.config.js
├── kibana.jsonc
├── package.json
├── tsconfig.json
```

### Config

`playwright` directory manages the default Playwright configuration. It exports the `createPlaywrightConfig` function, which is used by Kibana plugins to define Scout playwright configurations and serves as the entry point to run tests.

```ts
import { createPlaywrightConfig } from '@kbn/scout';

// eslint-disable-next-line import/no-default-export
export default createPlaywrightConfig({
  testDir: './tests',
  workers: 2,
});
```

Scout relies on configuration to determine the test files and opt-in [parallel test execution](https://playwright.dev/docs/test-parallel) against the single Elastic cluster.

The Playwright configuration should only be created this way to ensure compatibility with Scout functionality. Note that config files should be used inside the plugin we want to test.

### Fixtures

The `fixtures` directory contains core Security Scout capabilities required for testing the majority of Security Solution functionalities. [Fixtures](https://playwright.dev/docs/test-fixtures) can be scoped to either `test` or `worker`. Scope decides when to init a new fixture instance: once per worker or for every test function. It is important to choose the correct scope to keep test execution optimally fast: if **a new instance is not needed for every test**, the fixture should be scoped to **worker**. Otherwise, it should be scoped to **test**.

**Security Solution `worker` scoped fixtures:**

- `detectionRuleApi`

```ts
test.beforeAll(async ({ detectionRuleApi }) => {
  await detectionRuleApi.createCustomQueryRule(CUSTOM_QUERY_RULE);
});
```

**Security Solution `test` scoped fixtures:**

- `browserAuth`
- `pageObjects`

```ts
test.beforeEach(async ({ browserAuth }) => {
  await browserAuth.loginAsPlatformEngineer();
});
```

If a new fixture depends on a fixture with a `test` scope, it must also be `test` scoped.

### Page Objects

The `page_objects` directory contains all the Page Objects that represent Security Solution core functionality that can be reused through different Security Solution plugins.

If a Page Object is likely to be used in more than one plugin, it should be added here. This allows other teams to reuse it, improving collaboration across teams, reducing code duplication, and simplifying support and adoption.

If a Page Object can be used outside Security Solution, it should be created in `@kbn-scout`.

Page Objects must be registered with the `createLazyPageObject` function, which guarantees its instance is lazy-initialized. This way, we can have all the page objects available in the test context, but only the ones that are called will be actually initialized:

```ts
export function extendPageObjects(pageObjects: PageObjects, page: ScoutPage): SecurityPageObjects {
  return {
    ...pageObjects,
    alertsTablePage: createLazyPageObject(AlertsTablePage, page),
    alertDetailsRightPanelPage: createLazyPageObject(AlertDetailsRightPanelPage, page),
  };
}
```

All registered Page Objects are available via the `pageObjects` fixture:

```ts
test.beforeEach(async ({ pageObjects }) => {
  await pageObjects.alertsTablePage.navigate();
});
```

### Starting Servers Only

To start the servers without running tests, use the following command:

```bash
node scripts/scout.js start-server [--stateful|--serverless=security]
```

This is useful for manual testing or running tests via an IDE.

### Running Servers and Tests

To start the servers and run tests, use:

```bash
node scripts/scout.js run-tests [--stateful|--serverless=security] --config <plugin-path>/test/scout/ui/[playwright.config.ts|parallel.playwright.config.ts]
```

This command starts the required servers and then automatically executes the tests using Playwright.

### Running Tests Separately

If the servers are already running, you can execute tests independently using either:

- Playwright Plugin in IDE: Run tests directly within your IDE using Playwright's integration.
- Command Line: Use the following command to run tests:

```bash
npx playwright test --config <plugin-path>/test/scout/ui/[playwright.config.ts|parallel.playwright.config.ts] --project local
```

We use `project` flag to define test target, where tests to be run: local servers or Elastic Cloud. Currently we only support local servers.

### Adding A New Test

Any new test should be added in the `x-pack/solutions/security/plugins/security_solution/test/scout/ui` folder.

You have an example in: `x-pack/solutions/security/plugins/security_solution/test/scout/ui/parallel_tests/flyout/alert_details_url_sync.spec.ts`

### Adding Page Objects

1. **Create a New Page Object:** Add your Page Object to the src/playwright/fixtures/test/page_objects directory. For instance:

```ts
export class NewPage {
  constructor(private readonly page: ScoutPage) {}

  // implementation
}
```

2. **Register the Page Object:** Update the index file to include the new Page Object:

```ts
export function createCorePageObjects(page: ScoutPage): PageObjects {
  return {
    ...
    newPage: createLazyPageObject(NewPage, page),
  };
}
```

### Adding Fixtures

1. **Determine Fixture Scope:** Decide if your fixture should apply to the `test` (per-test) or `worker` (per-worker) scope.

2. **Implement the Fixture:** Add the implementation to `src/playwright/fixtures/test` or `src/playwright/fixtures/worker`.

You can use the existing fixtures as a guide.

3. **Register the Fixture:** Add the fixture to the appropriate scope in `src/playwright/fixtures/parallel_run_fixtures.ts` and/or `src/playwright/fixtures/single_thread_fixture.ts`

### Best Practices

- **Reusable Code:** When creating Page Objects or Fixtures that apply to more than one plugin, ensure they are added to the kbn-scout package.
- **Adhere to Existing Structure:** Maintain consistency with the project's architecture.
- **Playwright documentation:** [Official best practices](https://playwright.dev/docs/best-practices)
