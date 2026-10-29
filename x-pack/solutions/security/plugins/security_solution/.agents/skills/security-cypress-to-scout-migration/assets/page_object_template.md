# Page Object Template

```typescript
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, Locator } from '@kbn/scout-security';

const PAGE_URL = 'security/TODO_PAGE_PATH';

export class TODOPageNamePage {
  public todoElement: Locator;

  constructor(private readonly page: ScoutPage) {
    this.todoElement = this.page.testSubj.locator('todo-test-subj');
  }

  async navigate() {
    await this.page.gotoApp(PAGE_URL);
  }
}
```

## Wiring

After creating the page object:

1. Add it to `SecurityPageObjects` interface in `kbn-scout-security/src/playwright/fixtures/test/page_objects/index.ts`
2. Register it with `createLazyPageObject` in `extendPageObjects()`
3. Import and export from the index file
