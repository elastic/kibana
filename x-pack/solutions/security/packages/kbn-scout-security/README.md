# @kbn/scout-security

`kbn/scout-security` is a test library that extends [`kbn/scout`](https://github.com/elastic/kibana/blob/main/src/platform/packages/shared/kbn-scout/README.md) with test helpers specifically designed for `Security Solution` features in Kibana.

Its primary goal is to simplify the test development experience for teams working on `Security Solution` plugins by providing custom Playwright fixtures, page objects, and utilities tailored for Security Solution related testing scenarios.

### Table of Contents
1. Overview
2. Folder Structure
2. How to Use
3. Contributing

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
│   └── global_setup.ts
├── README.mk
├── index.ts
├── jest.config.js
├── kibana.jsonc
├── package.json
├── tsconfig.json
```

