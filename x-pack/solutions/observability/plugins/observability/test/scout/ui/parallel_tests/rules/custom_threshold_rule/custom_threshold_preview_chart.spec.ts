/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../../../fixtures';

test.describe(
  'Custom threshold preview chart',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
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
      const customEquation = page.testSubj.locator('customEquation');
      const customEquationField = page.testSubj.locator(
        'thresholdRuleCustomEquationEditorFieldText'
      );
      const customEquationPopoverCloseButton = page.testSubj.locator(
        'o11yClosablePopoverTitleButton'
      );
      const lensFailure = page.testSubj.locator('embeddable-lens-failure');

      await test.step('introduce an error and verify failure panel appears', async () => {
        await customEquation.click();
        await customEquationField.click();
        await customEquationField.fill('A +');
        await customEquationPopoverCloseButton.click();

        // The exact error message text varies by Lens version — only assert visibility.
        await expect(lensFailure).toBeVisible({ timeout: 20_000 });
      });

      await test.step('fix the error and verify failure panel disappears', async () => {
        // Popover and embeddable updates can race in CI. Retry the full "fix" flow
        // until Lens settles and the failure panel is gone.
        await expect(async () => {
          await customEquation.click();
          await expect(customEquationField).toBeVisible({ timeout: 20_000 });
          await customEquationField.fill('A');
          await expect(customEquationField).toHaveValue('A');
          await customEquationPopoverCloseButton.click();

          await expect(customEquation).toContainText('A');
          await expect(lensFailure).toBeHidden({ timeout: 20_000 });
        }).toPass({ timeout: 60_000, intervals: [500, 1000, 2000] });
      });
    });
  }
);
