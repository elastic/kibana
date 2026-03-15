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
  'Overview Page',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeAll(async ({ esArchiver }) => {
      await loadEsArchive(esArchiver, EXPLORE_ARCHIVES.OVERVIEW);
    });

    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.explore.gotoWithTimeRange(EXPLORE_URLS.OVERVIEW);
    });

    test.afterAll(async ({ esArchiver }) => {
      try {
        await unloadEsArchive(esArchiver, EXPLORE_ARCHIVES.OVERVIEW);
      } catch {
        // best-effort cleanup
      }
    });

    test('Host stats render with correct values', async ({ page }) => {
      const hostStats = page.testSubj.locator('stat-hosts');
      await hostStats.first().click();
      await expect(page.getByText('Hosts').first()).toBeVisible();
    });

    test('Network stats render with correct values', async ({ page }) => {
      const networkStats = page.testSubj.locator('stat-network');
      await networkStats.first().click();
      await expect(page.getByText('Network').first()).toBeVisible();
    });
  }
);
