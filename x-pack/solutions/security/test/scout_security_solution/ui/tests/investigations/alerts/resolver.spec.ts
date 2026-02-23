/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { deleteAlertsAndRules, createRule } from '../../../common/api_helpers';
import { ALERTS_URL } from '../../../common/urls';

test.describe('Analyze events view for alerts', { tag: tags.deploymentAgnostic }, () => {
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

  test('should render analyzer when button is clicked', async ({ page }) => {
    const analyzerButton = page.testSubj.locator('view-in-analyzer');
    await analyzerButton.click();

    await page.testSubj.locator('expand-event').click();

    const visualizeTab = page.testSubj.locator('securitySolutionFlyoutVisualizeTab');
    await visualizeTab.click();

    const analyzerGraphButton = page.testSubj.locator(
      'securitySolutionFlyoutVisualizeTabGraphAnalyzerButton'
    );
    await analyzerGraphButton.click();

    const analyzerNode = page.testSubj.locator('resolver:node');
    await expect(analyzerNode).toBeVisible({ timeout: 30_000 });
  });

  test('should display a toast for date range with 0 events', async ({ page }) => {
    await test.step('Set start date to range with zero events', async () => {
      const startDatePicker = page.testSubj.locator('superDatePickerstartDatePopoverButton');
      await startDatePicker.click();

      const absoluteTab = page.testSubj.locator('superDatePickerAbsoluteTab');
      await absoluteTab.click();

      const dateInput = page.testSubj.locator('superDatePickerAbsoluteDateInput');
      await dateInput.clear();
      await dateInput.fill('Jul 27, 2022 @ 00:00:00.000');
      await page.keyboard.press('Enter');
    });

    await page.testSubj.locator('expand-event').waitFor({ state: 'visible', timeout: 60_000 });

    await test.step('Open analyzer and verify toast', async () => {
      const analyzerButton = page.testSubj.locator('view-in-analyzer');
      await analyzerButton.click();

      await page.testSubj.locator('expand-event').click();

      const visualizeTab = page.testSubj.locator('securitySolutionFlyoutVisualizeTab');
      await visualizeTab.click();

      const analyzerGraphButton = page.testSubj.locator(
        'securitySolutionFlyoutVisualizeTabGraphAnalyzerButton'
      );
      await analyzerGraphButton.click();

      const toaster = page.locator('.euiToast');
      await expect(toaster).toBeVisible({ timeout: 30_000 });

      const analyzerNode = page.testSubj.locator('resolver:node');
      await expect(analyzerNode).toBeVisible({ timeout: 30_000 });
    });
  });
});
