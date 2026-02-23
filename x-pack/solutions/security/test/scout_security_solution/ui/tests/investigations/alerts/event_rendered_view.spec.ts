/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { deleteAlertsAndRules, createRule } from '../../../common/api_helpers';
import { ALERTS_URL } from '../../../common/urls';

test.describe('Event Rendered View', { tag: tags.deploymentAgnostic }, () => {
  test.beforeEach(async ({ browserAuth, page, apiServices }) => {
    await deleteAlertsAndRules(apiServices);
    await createRule(apiServices);
    await browserAuth.loginAsAdmin();
    await page.goto(ALERTS_URL);
    await page.testSubj
      .locator('events-container-loading-false')
      .waitFor({ state: 'visible', timeout: 60_000 });

    await page.testSubj.locator('additionalFilters').click();
    await page.testSubj.locator('dataGridEventRenderedViewSwitch').click();
    await page.testSubj
      .locator('events-container-loading-false')
      .waitFor({ state: 'visible', timeout: 60_000 });
  });

  test.afterAll(async ({ apiServices }) => {
    await deleteAlertsAndRules(apiServices);
  });

  test('should show Event Summary column correctly', async ({ page }) => {
    const eventSummaryColumn = page.testSubj.locator('event-summary-column');
    await expect(eventSummaryColumn).toBeVisible();

    const rendererContent = page.testSubj.locator('event-summary-alert-renderer-content');
    await expect(rendererContent).toBeVisible();
  });

  test('should show TopN in Event Summary column', async ({ page }) => {
    const hostNameRenderer = page.testSubj.locator('render-content-host.name');
    await hostNameRenderer.hover();

    const showTopN = page.testSubj.locator('show-top-field');
    await showTopN.click();

    const topNHeader = page.testSubj.locator('topN-title');
    await expect(topNHeader).toContainText('Top host.name');

    const topNDropdown = page.testSubj.locator('showTopNSelect');
    await topNDropdown.click();

    const alertOption = page.testSubj.locator('showTopNSelectOption-alert');
    await alertOption.click();

    const topNHistogram = page.testSubj.locator('topN-alert-histogram');
    await expect(topNHistogram).toBeVisible();

    const closeBtn = page.testSubj.locator('topN-container-close-btn');
    await closeBtn.click();

    await expect(topNHistogram).toBeHidden();
  });

  test('should not show Field Browser', async ({ page }) => {
    const fieldsBrowserBtn = page.testSubj.locator('show-field-browser');
    await expect(fieldsBrowserBtn).toBeHidden();
  });

  test('should not show Sorting Control', async ({ page }) => {
    const sortBtn = page.testSubj.locator('dataGridColumnSortingButton');
    await expect(sortBtn).toBeHidden();
  });

  test('should not show column order control', async ({ page }) => {
    const columnOrderBtn = page.testSubj.locator('dataGridColumnSelectorButton');
    await expect(columnOrderBtn).toBeHidden();
  });
});
