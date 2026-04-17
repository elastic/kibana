/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';

test.describe('UX Client Metrics', { tag: tags.stateful.classic }, () => {
  test('displays client metrics values', async ({ pageObjects, page, browserAuth }) => {
    await test.step('Navigate to UX Dashboard', async () => {
      await browserAuth.loginAsViewer();
      await pageObjects.uxDashboard.goto();
      await pageObjects.uxDashboard.waitForLoadingToFinish();
    });

    await test.step('Confirm metrics values', async () => {
      await pageObjects.uxDashboard.waitForChartData();
      await expect(page.testSubj.locator('uxClientMetrics-totalPageLoad')).toContainText('Total');
      await expect(page.testSubj.locator('uxClientMetrics-totalPageLoad')).toContainText('4.24 s');

      await expect(page.testSubj.locator('uxClientMetrics-backend')).toContainText('Backend');
      await expect(page.testSubj.locator('uxClientMetrics-backend')).toContainText('359 ms');

      await expect(page.testSubj.locator('uxClientMetrics-frontend')).toContainText('Frontend');
      await expect(page.testSubj.locator('uxClientMetrics-frontend')).toContainText('3.88 s');

      await expect(page.testSubj.locator('uxClientMetrics-pageViews')).toContainText(
        'Total page views'
      );
      await expect(page.testSubj.locator('uxClientMetrics-pageViews')).toContainText('524');
    });
  });
});
