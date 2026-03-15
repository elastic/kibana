/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { deleteAlertsAndRules, createRule } from '../../../common/api_helpers';
import { ALERTS_URL } from '../../../common/urls';

test.describe('Alerts cell actions', { tag: tags.deploymentAgnostic }, () => {
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

  test('should filter in and out existing values', async ({ page }) => {
    await test.step('Filter in severity value', async () => {
      const severityCell = page.testSubj
        .locator('dataGridRowCell')
        .locator('[data-gridcell-column-id="kibana.alert.severity"]');
      await severityCell.hover();

      const expandBtn = page.testSubj.locator('euiDataGridCellExpandButton');
      await expandBtn.click();

      await page.testSubj.locator('filterForCellValue').click();

      const filterBadge = page.testSubj.locator('filter-badge');
      await expect(filterBadge).toContainText('kibana.alert.severity');
    });

    await test.step('Remove filter', async () => {
      const filterBadgeClose = page.testSubj.locator('filter-badge-delete');
      await filterBadgeClose.click();
    });

    await test.step('Filter out severity value', async () => {
      const severityCell = page.testSubj
        .locator('dataGridRowCell')
        .locator('[data-gridcell-column-id="kibana.alert.severity"]');
      await severityCell.hover();

      const expandBtn = page.testSubj.locator('euiDataGridCellExpandButton');
      await expandBtn.click();

      await page.testSubj.locator('filterOutCellValue').click();

      const filterBadge = page.testSubj.locator('filter-badge');
      await expect(filterBadge).toContainText('NOT kibana.alert.severity');
    });
  });

  test('should allow copy paste', async ({ page }) => {
    const severityCell = page.testSubj
      .locator('dataGridRowCell')
      .locator('[data-gridcell-column-id="kibana.alert.severity"]');
    await severityCell.hover();

    const expandBtn = page.testSubj.locator('euiDataGridCellExpandButton');
    await expandBtn.click();

    const copyButton = page.testSubj.locator('copyClipboardButton');
    await expect(copyButton).toBeVisible();
  });

  test('should add a non-empty property to default timeline', async ({ page }) => {
    const severityCell = page.testSubj
      .locator('dataGridRowCell')
      .locator('[data-gridcell-column-id="kibana.alert.severity"]');
    await severityCell.hover();

    const expandBtn = page.testSubj.locator('euiDataGridCellExpandButton');
    await expandBtn.click();

    await page.testSubj.locator('addToTimelineCellAction').click();

    await page.testSubj.locator('timeline-bottom-bar-title-button').click();

    const providerBadge = page.testSubj.locator('providerContainer');
    await expect(providerBadge).toContainText('kibana.alert.severity');
  });

  test('should show top N for a property', async ({ page }) => {
    const severityCell = page.testSubj
      .locator('dataGridRowCell')
      .locator('[data-gridcell-column-id="kibana.alert.severity"]');
    await severityCell.hover();

    const expandBtn = page.testSubj.locator('euiDataGridCellExpandButton');
    await expandBtn.click();

    await page.testSubj.locator('showTopNCellAction').click();

    const topNHeader = page.testSubj.locator('topN-title');
    await expect(topNHeader).toContainText('Top kibana.alert.severity');
  });
});
