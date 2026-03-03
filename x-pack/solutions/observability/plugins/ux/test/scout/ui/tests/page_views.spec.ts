/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';

// This journey was commented out in the original synthetics index.ts but the test code is valid
test.describe('Page Views Chart', { tag: tags.stateful.classic }, () => {
  test('displays page views with browser breakdown', async ({ pageObjects, page, browserAuth }) => {
    await test.step('Navigate to UX Dashboard', async () => {
      await browserAuth.loginAsViewer();
      await pageObjects.uxDashboard.goto();
      await pageObjects.uxDashboard.waitForLoadingToFinish();
    });

    await test.step('Select browser breakdown', async () => {
      await pageObjects.uxDashboard.waitForChartData();
      await pageObjects.uxDashboard.selectBreakdownOption('pvBreakdownFilter', 'Browser');
    });

    await test.step('Verify browser breakdown values', async () => {
      await expect(page.getByText('Chrome', { exact: true })).toBeVisible();
      await expect(page.getByText('Chrome Mobile iOS', { exact: true })).toBeVisible();
      await expect(page.getByText('Edge', { exact: true })).toBeVisible();
      await expect(page.getByText('Safari', { exact: true })).toBeVisible();
      await expect(page.getByText('Firefox', { exact: true })).toBeVisible();
    });

    await test.step('Navigate to exploratory view', async () => {
      await page.testSubj
        .locator('uxPageViewsChart')
        .locator('[data-testid="echLegendItemLabel"]', { hasText: 'Firefox' })
        .hover();
      await pageObjects.uxDashboard.embeddablePanelMenuIcon().click();
      await page.testSubj.click('embeddablePanelAction-expViewExplore');
      await page.waitForURL(/exploratory-view/);
    });

    await test.step('Verify chart in exploratory view', async () => {
      await pageObjects.uxDashboard.waitForChartData();
      await expect(page.getByText('User experience (RUM)')).toBeVisible();
      await expect(page.getByText('Page views')).toBeVisible();
      await expect(page.getByText('Chrome', { exact: true })).toBeVisible();
      await expect(page.getByText('Chrome Mobile iOS', { exact: true })).toBeVisible();
      await expect(page.getByText('Edge', { exact: true })).toBeVisible();
      await expect(page.getByText('Safari', { exact: true })).toBeVisible();
      await expect(page.getByText('Firefox', { exact: true })).toBeVisible();
    });
  });
});
