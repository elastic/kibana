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
  'Hover actions - Network',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeAll(async ({ esArchiver }) => {
      await loadEsArchive(esArchiver, EXPLORE_ARCHIVES.NETWORK);
    });

    test.beforeEach(async ({ browserAuth, page, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.explore.gotoWithTimeRange(EXPLORE_URLS.NETWORK_FLOWS);
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

    test('Copy value', async ({ page }) => {
      const copyButton = page.testSubj.locator('copy-to-clipboard').first();
      await copyButton.click();
      await expect(copyButton).toBeVisible();
    });

    test('Adds global filter - filter in', async ({ page }) => {
      const filterInButton = page.testSubj.locator('filter-in-button').first();
      await filterInButton.click();
      const filterItem = page.testSubj.locator('filter filter-enabled').first();
      await expect(filterItem).toContainText('destination.domain:');
    });

    test('Adds global filter - filter out', async ({ page }) => {
      const filterOutButton = page.testSubj.locator('filter-out-button').first();
      await filterOutButton.click();
      const filterItem = page.testSubj.locator('filter filter-enabled').first();
      await expect(filterItem).toContainText('NOT destination.domain:');
    });

    test('Adds to timeline', async ({ page }) => {
      const addToTimelineButton = page.testSubj.locator('add-to-timeline').first();
      await addToTimelineButton.click();
      const timelineToggle = page.testSubj.locator('timeline-solution-side-nav-toggle').first();
      await timelineToggle.click();
      const dataProviders = page.testSubj.locator('data-provider');
      await expect(dataProviders.first()).toContainText('destination.domain');
    });

    test('Show topN', async ({ page }) => {
      const showTopNButton = page.testSubj.locator('show-top-n').first();
      await showTopNButton.click();
      await expect(page.getByText('Top destination.domain').first()).toBeVisible();
    });
  }
);
