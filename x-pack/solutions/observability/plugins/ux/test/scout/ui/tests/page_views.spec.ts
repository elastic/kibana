/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';

test.describe('Page Views Chart', { tag: tags.stateful.classic }, () => {
  test('displays page views with browser breakdown', async ({ pageObjects, page, browserAuth }) => {
    await test.step('Navigate to UX Dashboard', async () => {
      await browserAuth.loginAsAdmin();
      await pageObjects.uxDashboard.goto();
      await pageObjects.uxDashboard.waitForLoadingToFinish();
    });

    await test.step('Select browser breakdown', async () => {
      const breakdownButton = page.locator(
        'text=Total page viewsSelect an option: No breakdown, is selectedNo breakdown >> button'
      );
      await breakdownButton.click();
      await page.locator('button[role="option"]:has-text("Browser")').click();
    });

    await test.step('Verify browser breakdown values', async () => {
      await expect(page.getByText('Chrome')).toBeVisible();
      await expect(page.getByText('Chrome Mobile iOS')).toBeVisible();
      await expect(page.getByText('Edge')).toBeVisible();
      await expect(page.getByText('Safari')).toBeVisible();
      await expect(page.getByText('Firefox')).toBeVisible();
    });

    await test.step('Navigate to exploratory view', async () => {
      await page.hover('text=Firefox');
      await page.testSubj.click('embeddablePanelToggleMenuIcon');
      await page.testSubj.click('embeddablePanelAction-expViewExplore');
      await page.waitForURL(/exploratory-view/);
    });

    await test.step('Verify chart in exploratory view', async () => {
      await expect(page.getByText('User experience (RUM)')).toBeVisible();
      await expect(page.getByText('Page views')).toBeVisible();
      await expect(page.getByText('Chrome')).toBeVisible();
      await expect(page.getByText('Chrome Mobile iOS')).toBeVisible();
      await expect(page.getByText('Edge')).toBeVisible();
      await expect(page.getByText('Safari')).toBeVisible();
      await expect(page.getByText('Firefox')).toBeVisible();
    });
  });
});
