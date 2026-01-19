/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { expect } from '@kbn/scout-oblt';
import { test } from '../../../fixtures';

test.describe('Custom threshold preview chart', { tag: ['@ess', '@svlOblt'] }, () => {
  const previewChartDataTestSubj = 'thresholdRulePreviewChart';

  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();

    await pageObjects.rulesPage.goto();

    await pageObjects.rulesPage.createRuleButton.click();
    await pageObjects.rulesPage.observabilityCategory.click();
    await pageObjects.rulesPage.customThresholdRuleTypeCard.click();
  });

  test('should render the empty chart only once at bootstrap', async ({ page }) => {
    const previewChart = page.testSubj.locator(previewChartDataTestSubj);
    await expect(previewChart.locator('[data-rendering-count="2"]')).toBeVisible();
  });

  test('should handle the error message correctly', async ({ page }) => {
    await expect(async () => {
      const customEquationField = page.testSubj.locator(
        'thresholdRuleCustomEquationEditorFieldText'
      );

      // Introduce an error in the equation
      await page.testSubj.click('customEquation');
      await customEquationField.click();
      await customEquationField.fill('A +');
      await page.testSubj.click('o11yClosablePopoverTitleButton');

      const lensFailure = page.testSubj.locator('embeddable-lens-failure');
      await expect(lensFailure).toBeVisible();
      await expect(lensFailure).toContainText('An error occurred while rendering the chart');

      // Fix the introduced error
      await page.testSubj.click('customEquation');
      await customEquationField.click();
      await customEquationField.fill('A');
      await page.testSubj.click('o11yClosablePopoverTitleButton');

      // Wait for the chart to re-render after fixing the equation
      await expect(lensFailure).toBeHidden();
    }).toPass({ timeout: 15_000, intervals: [1000] });
  });
});
