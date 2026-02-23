/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { loadEsArchive, unloadEsArchive } from '../../../common/es_helpers';
import { EXPLORE_ARCHIVES, EXPLORE_URLS } from '../../../fixtures/page_objects';

const defaultHeadersInDefaultEcsCategory = [
  '@timestamp',
  'message',
  'host.name',
  'event.action',
  'user.name',
  'source.ip',
  'destination.ip',
];

test.describe(
  'Events Viewer',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeAll(async ({ esArchiver }) => {
      await loadEsArchive(esArchiver, EXPLORE_ARCHIVES.AUDITBEAT_MULTIPLE);
    });

    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.explore.gotoWithTimeRange(EXPLORE_URLS.HOSTS_ALL);
      await pageObjects.explore.clickEventsTab();
    });

    test.afterAll(async ({ esArchiver }) => {
      try {
        await unloadEsArchive(esArchiver, EXPLORE_ARCHIVES.AUDITBEAT_MULTIPLE);
      } catch {
        // best-effort cleanup
      }
    });

    test.describe('Fields rendering', () => {
      test.beforeEach(async ({ page }) => {
        await page.testSubj.locator('show-field-browser').first().click();
        await page.testSubj
          .locator('fields-browser-container')
          .first()
          .waitFor({ state: 'visible', timeout: 10_000 });
      });

      test('displays "view all" option by default', async ({ page }) => {
        const viewButton = page.testSubj.locator('viewSelectorButton').first();
        await expect(viewButton).toContainText('View: all');
      });

      test('displays all categories (by default)', async ({ page }) => {
        const badges = page.testSubj
          .locator('fields-browser-container')
          .locator('[data-test-subj="category-badges"]');
        await expect(badges.first()).toHaveCount(0);
      });

      test('displays only the default selected fields when "view selected" option is enabled', async ({
        page,
      }) => {
        await page.testSubj.locator('viewSelectorButton').first().click();
        await page.testSubj.locator('viewSelectorOption-selected').first().click();
        const container = page.testSubj.locator('fields-browser-container');
        for (const fieldId of defaultHeadersInDefaultEcsCategory) {
          const checkbox = container.locator(`[data-test-subj="field-${fieldId}-checkbox"]`);
          await expect(checkbox.first()).toBeChecked();
        }
        await page.testSubj.locator('viewSelectorButton').first().click();
        await page.testSubj.locator('viewSelectorOption-all').first().click();
      });
    });

    test.describe('Events viewer fields behaviour', () => {
      test.beforeEach(async ({ page }) => {
        await page.testSubj.locator('show-field-browser').first().click();
        await page.testSubj
          .locator('fields-browser-container')
          .first()
          .waitFor({ state: 'visible', timeout: 10_000 });
      });

      test('adds a field to the events viewer when the user clicks the checkbox', async ({
        page,
      }) => {
        const filterInput = page.testSubj.locator('field-search').first();
        await filterInput.fill('host.geo.c');
        const hostGeoCityCheckbox = page.testSubj
          .locator('field-host.geo.city_name-checkbox')
          .first();
        await hostGeoCityCheckbox.click();
        await page.testSubj
          .locator('fields-browser-container')
          .locator('[data-test-subj="close"]')
          .first()
          .click();
        const hostGeoCityHeader = page.testSubj.locator('header-cell-host.geo.city_name');
        await expect(hostGeoCityHeader.first()).toBeVisible({ timeout: 5000 });
      });

      test('resets all fields in the events viewer when Reset Fields is clicked', async ({
        page,
      }) => {
        const filterInput = page.testSubj.locator('field-search').first();
        await filterInput.fill('host.geo.c');
        const hostGeoCountryCheckbox = page.testSubj
          .locator('field-host.geo.country_name-checkbox')
          .first();
        await hostGeoCountryCheckbox.click();
        await page.testSubj
          .locator('fields-browser-container')
          .locator('[data-test-subj="close"]')
          .first()
          .click();
        await page.testSubj.locator('reset-fields').first().click();
        const hostGeoCountryHeader = page.testSubj.locator('header-cell-host.geo.country_name');
        await expect(hostGeoCountryHeader.first()).toHaveCount(0);
      });
    });

    test.describe('Events behavior', () => {
      test('filters the events by applying filter criteria from the search bar', async ({
        page,
      }) => {
        const filterInput = 'aa7ca589f1b8220002f2fc61c64cfbf1';
        const serverSideEventCount = page.testSubj.locator('server-side-event-count');
        await expect(serverSideEventCount.first()).toBeVisible({ timeout: 15_000 });
        const kqlInput = page.testSubj.locator('queryInput').first();
        await kqlInput.fill(filterInput);
        await kqlInput.press('Enter');
        const dataGridEmpty = page.testSubj.locator('dataGridEmptyState');
        await expect(dataGridEmpty.first()).toBeVisible({ timeout: 10_000 });
      });
    });
  }
);
