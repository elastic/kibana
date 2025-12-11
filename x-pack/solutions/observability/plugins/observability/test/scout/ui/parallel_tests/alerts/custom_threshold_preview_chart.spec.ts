/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { expect } from '@kbn/scout-oblt';
import { test } from '../../fixtures';

test.describe('Custom threshold preview chart', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.rulesPage.goto();
  });

  test('should render the empty chart only once at bootstrap', async ({ pageObjects, page }) => {
    const previewChartDataTestSubj = 'thresholdRulePreviewChart';
    await pageObjects.rulesPage.createRuleButton.click();

    await pageObjects.rulesPage.observabilityCategory.click();

    await pageObjects.rulesPage.customThresholdRuleType.click();

    const previewChart = page.testSubj.locator(previewChartDataTestSubj);
    await expect(previewChart.locator('[data-rendering-count="2"]')).toBeVisible();
  });
});
