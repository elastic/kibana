/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// FLAKY: https://github.com/elastic/kibana/issues/165712

import { test, tags } from '../../../fixtures';

test.describe.skip(
  'Cases connector incident fields',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, page }) => {
      await browserAuth.loginAsAdmin();
      await page.route('**/api/cases/configure/connectors/_find', (route) =>
        route.fulfill({
          status: 200,
          body: JSON.stringify({ data: [], total: 0 }),
        })
      );
    });

    test.skip('Correct incident fields show when connector is changed', async () => {
      // Requires mock connectors (Jira, ServiceNow, IBM Resilient) and intercepts
    });
  }
);
