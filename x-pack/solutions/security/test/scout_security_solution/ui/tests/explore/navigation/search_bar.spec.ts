/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { EXPLORE_URLS } from '../../../fixtures/page_objects';

// Failing: See https://github.com/elastic/kibana/issues/182932
test.describe.skip(
  'SearchBar',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.explore.gotoWithTimeRange(EXPLORE_URLS.HOSTS_ALL);
      await pageObjects.explore.allHostsTable
        .first()
        .waitFor({ state: 'visible', timeout: 15_000 });
    });

    test('adds correctly a filter to the global search bar', async ({ page }) => {
      await page.testSubj.locator('addFilter').first().click();
      const filterItem = page.testSubj.locator('filter filter-enabled').first();
      await expect(filterItem).toBeVisible({ timeout: 10_000 });
    });

    test('auto suggests fields from the data view', async ({ pageObjects, page }) => {
      await pageObjects.explore.kqlInput.click();
      await expect(page.testSubj.locator('suggestionListItem').first()).toBeVisible({
        timeout: 5_000,
      });
    });
  }
);
