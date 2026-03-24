# @kbn/scout-search

`@kbn/scout-search` is a test library that extends `@kbn/scout` with test helpers specifically designed for `Search` products in Kibana.

Its primary goal is to simplify the test development experience for teams working on `Search` plugins by providing custom Playwright fixtures, page objects, and utilities tailored for Search-related testing scenarios.

### Table of Contents

1. Folder Structure
2. How to Use
3. Contributing

### Folder Structure

The `@kbn/scout-search` structure includes the following key directories and files:

```
x-pack/solutions/search/packages/kbn-scout-search/
├── src/
│   ├── playwright/
│   │   └── fixtures
│   │   │   └── test/
│   │   │   │   └── // Search test-scope fixtures
│   │   │   └── worker/
│   │   │   │   └── // Search worker-scope fixtures
│   │   │   └── single_thread_fixtures.ts
│   │   │   └── parallel_run_fixtures.ts
│   │   │   └── types.ts
│   │   │   └── index.ts
│   │   └── page_objects/
│   │   │   └── // Search pages
│   └── index.ts
├── package.json
├── tsconfig.json
```

### How to use

```
import { test } from '@kbn/scout-search';

test('verifies Search functionality', async ({ page, pageObjects }) => {
  // Your test logic here
});
```
