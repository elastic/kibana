/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';

test.describe('UX Long Task Metrics', { tag: tags.stateful.classic }, () => {
  test('displays long task metrics values', async ({ pageObjects, page, browserAuth }) => {
    await test.step('Navigate to UX Dashboard', async () => {
      await browserAuth.loginAsViewer();
      await pageObjects.uxDashboard.goto();
      await pageObjects.uxDashboard.waitForLoadingToFinish();
    });

    await test.step('Confirm long task metrics values', async () => {
      await pageObjects.uxDashboard.waitForChartData();
      const longestTask = page.testSubj.locator('uxLongestTask');
      await expect(longestTask).toContainText('Longest long task duration');
      await expect(longestTask).toContainText('237 ms');

      const longTaskCount = page.testSubj.locator('uxLongTaskCount');
      await expect(longTaskCount).toContainText('No. of long tasks');
      await expect(longTaskCount).toContainText('3');

      const sumLongTask = page.testSubj.locator('uxSumLongTask');
      await expect(sumLongTask).toContainText('Total long tasks duration');
      await expect(sumLongTask).toContainText('428 ms');
    });
  });
});
