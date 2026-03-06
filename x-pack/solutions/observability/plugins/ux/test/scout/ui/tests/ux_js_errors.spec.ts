/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';

test.describe('UX JS Errors', { tag: tags.stateful.classic }, () => {
  test('displays JS error count', async ({ pageObjects, page, browserAuth }) => {
    await test.step('Navigate to UX Dashboard', async () => {
      await browserAuth.loginAsViewer();
      await pageObjects.uxDashboard.goto();
      await pageObjects.uxDashboard.waitForLoadingToFinish();
    });

    await test.step('Confirm error count', async () => {
      await pageObjects.uxDashboard.scrollToSection('JavaScript errors');
      await pageObjects.uxDashboard.waitForChartData();

      const jsErrorsTotal = page.testSubj.locator('uxJsErrorsTotal');
      await expect(jsErrorsTotal).toContainText('Total errors');
      await expect(jsErrorsTotal).toContainText('3 k');
    });
  });
});
