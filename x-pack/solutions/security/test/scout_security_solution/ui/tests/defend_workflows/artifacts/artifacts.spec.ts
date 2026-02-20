/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../../fixtures';

test.describe(
  'Artifacts',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test('should navigate between artifact tabs from policy details', async ({
      page,
      pageObjects,
    }) => {
      await pageObjects.endpointList.goto();
      await pageObjects.endpointList.waitForPageToLoad();
      await expect(page.testSubj.locator('endpointListTable').first()).toBeVisible();
    });

    test.skip('should open artifact tabs from policy - requires policy with artifacts', async () => {
      // Skipped: requires createAgentPolicy and policy details
    });
  }
);
