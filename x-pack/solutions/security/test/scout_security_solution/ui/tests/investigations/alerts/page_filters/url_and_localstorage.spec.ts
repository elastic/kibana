/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encode } from '@kbn/rison';
import { test, expect, tags } from '../../../../fixtures';
import { deleteAlertsAndRules, createRule } from '../../../../common/api_helpers';
import { ALERTS_URL, CASES_URL } from '../../../../common/urls';

const DEFAULT_FILTER_TITLES = ['Status', 'Severity', 'User', 'Host'];

test.describe(
  'Alerts page filters - URL and localStorage interactions',
  { tag: tags.deploymentAgnostic },
  () => {
    test.beforeEach(async ({ browserAuth, page, apiServices }) => {
      await deleteAlertsAndRules(apiServices);
      await createRule(apiServices);
      await browserAuth.loginAsAdmin();
      await page.goto(ALERTS_URL);
      await page.testSubj.locator('expand-event').waitFor({ state: 'visible', timeout: 60_000 });
    });

    test.afterAll(async ({ apiServices }) => {
      await deleteAlertsAndRules(apiServices);
    });

    test('should populate page filters with default values when nothing is provided in the URL', async ({
      page,
      pageObjects,
    }) => {
      await pageObjects.alertFilters.waitForFiltersToLoad();

      for (let i = 0; i < DEFAULT_FILTER_TITLES.length; i++) {
        const title = pageObjects.alertFilters.getControlFrameTitle(i);
        await expect(title).toContainText(DEFAULT_FILTER_TITLES[i]);
      }
    });

    test('should load page filters with custom values provided in the URL', async ({
      page,
      pageObjects,
    }) => {
      const customPageFilters = [
        {
          title: 'Status',
          fieldName: 'kibana.alert.workflow_status',
          selectedOptions: ['open', 'acknowledged'],
          existsSelected: false,
          exclude: false,
        },
      ];

      const currentUrl = new URL(page.url());
      currentUrl.searchParams.set('pageFilters', encode(customPageFilters));
      await page.goto(currentUrl.toString());

      await pageObjects.alertFilters.waitForFiltersToLoad();
      await page.testSubj
        .locator('events-container-loading-false')
        .waitFor({ state: 'visible', timeout: 60_000 });

      const statusValues = page.testSubj.locator('optionsList-control-0');
      await expect(statusValues).toContainText('open');
    });

    test('should load page filters with custom filters and values', async ({
      page,
      pageObjects,
    }) => {
      const customUrlFilter = [
        {
          title: 'Process',
          fieldName: 'process.name',
          selectedOptions: ['testing123'],
          existsSelected: false,
          exclude: false,
        },
      ];

      const currentUrl = new URL(page.url());
      currentUrl.searchParams.set('pageFilters', encode(customUrlFilter));
      await page.goto(currentUrl.toString());

      await pageObjects.alertFilters.waitForFiltersToLoad();

      await expect(pageObjects.alertFilters.changedBanner).toBeVisible();
    });

    test('should update the URL when filters are updated', async ({ page, pageObjects }) => {
      await pageObjects.alertFilters.waitForFiltersToLoad();
      const urlBefore = page.url();

      const severityFilter = pageObjects.alertFilters.getOptionListControl(1);
      await severityFilter.click();
      const highOption = page.testSubj.locator('optionsList-control-selection-high');
      await highOption.click();
      await page.keyboard.press('Escape');

      await expect.poll(() => page.url(), { timeout: 10_000 }).not.toBe(urlBefore);
      expect(page.url()).toContain('pageFilters');
    });

    test('should restore filters from localStorage when user navigates back to the page', async ({
      page,
      pageObjects,
    }) => {
      await pageObjects.alertFilters.waitForFiltersToLoad();

      await test.step('Select high severity filter', async () => {
        const severityFilter = pageObjects.alertFilters.getOptionListControl(1);
        await severityFilter.click();
        const highOption = page.testSubj.locator('optionsList-control-selection-high');
        await highOption.click();
        await page.keyboard.press('Escape');

        await page.testSubj
          .locator('events-container-loading-false')
          .waitFor({ state: 'visible', timeout: 60_000 });
      });

      await test.step('Navigate away and come back', async () => {
        await page.goto(CASES_URL);
        await page.goto(ALERTS_URL);
        await pageObjects.alertFilters.waitForFiltersToLoad();
      });

      await test.step('Verify filters are preserved', async () => {
        const statusValues = page.testSubj.locator('optionsList-control-0');
        await expect(statusValues).toContainText('open');

        const severityValues = page.testSubj.locator('optionsList-control-1');
        await expect(severityValues).toContainText('high');
      });
    });
  }
);
