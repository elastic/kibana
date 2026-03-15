/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { loadEsArchive, unloadEsArchive } from '../../../common/es_helpers';
import { EXPLORE_ARCHIVES, EXPLORE_URLS } from '../../../fixtures/page_objects';

test.describe(
  'Overflow items - Network stats and tables',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeAll(async ({ esArchiver }) => {
      await loadEsArchive(esArchiver, EXPLORE_ARCHIVES.NETWORK);
    });

    test.beforeEach(async ({ browserAuth, page, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.explore.gotoWithTimeRange(EXPLORE_URLS.NETWORK_FLOWS);

      await expect(page.testSubj.locator('destinationDomain').first()).not.toBeVisible();
      await expect(page.testSubj.locator('add-to-timeline').first()).not.toBeVisible();

      await page.testSubj.locator('load-more-button').first().click();
      await page.getByRole('button', { name: 'More' }).first().hover();
    });

    test.afterAll(async ({ esArchiver }) => {
      try {
        await unloadEsArchive(esArchiver, EXPLORE_ARCHIVES.NETWORK);
      } catch {
        // best-effort cleanup
      }
    });

    test('Shows more items in the popover', async ({ page }) => {
      const testDomainOne = 'myTest';
      const testDomainTwo = 'myTest2';
      const destDomain = page.testSubj.locator('destinationDomain');
      await expect(destDomain.nth(0)).toHaveText(testDomainOne);
      await expect(destDomain.nth(1)).toHaveText(testDomainTwo);
    });

    test('Shows Hover actions for more items in the popover', async ({ page }) => {
      await expect(page.testSubj.locator('add-to-timeline').first()).toBeVisible();
      await expect(page.testSubj.locator('filter-in-button').first()).toBeVisible();
      await expect(page.testSubj.locator('filter-out-button').first()).toBeVisible();
    });
  }
);
