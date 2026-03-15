/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { EXPLORE_URLS } from '../../../fixtures/page_objects';

test.describe(
  'SearchBar',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.explore.gotoWithTimeRange(EXPLORE_URLS.HOSTS_ALL);
      await pageObjects.explore.allHostsTable
        .waitFor({ state: 'visible', timeout: 30_000 })
        .catch(() => {});
    });

    test('search bar is visible and accepts input', async ({ page }) => {
      const queryInput = page.testSubj.locator('queryInput');
      await expect(queryInput).toBeVisible({ timeout: 10_000 });
      await queryInput.click();
      await queryInput.fill('host.name: *');
      await queryInput.press('Enter');
      await expect(page).toHaveURL(/query/);
    });

    test('auto suggests fields from the data view', async ({ pageObjects, page }) => {
      const queryInput = page.testSubj.locator('queryInput');
      await queryInput.click();
      const suggestions = page.testSubj.locator('autoCompleteSuggestionText');
      await expect(suggestions).toBeVisible({ timeout: 10_000 });
    });
  }
);
