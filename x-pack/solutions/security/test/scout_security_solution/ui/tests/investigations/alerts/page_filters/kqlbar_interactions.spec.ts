/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../../fixtures';
import { deleteAlertsAndRules, createRule } from '../../../../common/api_helpers';
import { ALERTS_URL } from '../../../../common/urls';

test.describe(
  'Alerts page filters - KQL bar interactions',
  { tag: tags.deploymentAgnostic },
  () => {
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

    test('should recover from invalid KQL query result', async ({ page, pageObjects }) => {
      const kqlInput = page.testSubj.locator('queryInput');
      await kqlInput.click();
      await kqlInput.fill('\\');
      await page.keyboard.press('Enter');

      await page.reload();
      await pageObjects.alertFilters.waitForFiltersToLoad();

      const toaster = page.locator('.euiToast');
      await expect(toaster).toContainText('KQLSyntaxError');

      const firstFilter = pageObjects.alertFilters.getOptionListControl(0);
      await firstFilter.click();

      const openOption = page.testSubj.locator('optionsList-control-selection-open');
      await expect(openOption).toBeVisible();
      await expect(openOption).toContainText('open');
    });

    test('should take KQL query into account', async ({ page, pageObjects }) => {
      const kqlInput = page.testSubj.locator('queryInput');
      await kqlInput.click();
      await kqlInput.fill('kibana.alert.workflow_status: "nothing"');
      await page.keyboard.press('Enter');

      await page.reload();
      await pageObjects.alertFilters.waitForFiltersToLoad();

      const firstFilter = pageObjects.alertFilters.getOptionListControl(0);
      await firstFilter.click();

      const popover = page.testSubj.locator('optionsList-control-popover');
      await expect(popover).toContainText('No options found');

      await expect(page.testSubj.locator('alertsTableEmptyState')).toBeVisible();
    });

    test('should take time range into account', async ({ page, pageObjects }) => {
      const startDatePicker = page.testSubj.locator('superDatePickerstartDatePopoverButton');
      await startDatePicker.click();
      const startAbsoluteTab = page.testSubj.locator('superDatePickerAbsoluteTab');
      await startAbsoluteTab.click();
      const startInput = page.testSubj.locator('superDatePickerAbsoluteDateInput');
      await startInput.clear();
      await startInput.fill('Jan 1, 2002 @ 00:00:00.000');
      await page.keyboard.press('Enter');

      const endDatePicker = page.testSubj.locator('superDatePickerendDatePopoverButton');
      await endDatePicker.click();
      const endAbsoluteTab = page.testSubj.locator('superDatePickerAbsoluteTab');
      await endAbsoluteTab.click();
      const endInput = page.testSubj.locator('superDatePickerAbsoluteDateInput');
      await endInput.clear();
      await endInput.fill('Jan 1, 2002 @ 00:00:00.000');
      await page.keyboard.press('Enter');

      await page.reload();
      await pageObjects.alertFilters.waitForFiltersToLoad();

      const firstFilter = pageObjects.alertFilters.getOptionListControl(0);
      await firstFilter.click();

      const popover = page.testSubj.locator('optionsList-control-popover');
      await expect(popover).toContainText('No options found');

      await expect(page.testSubj.locator('alertsTableEmptyState')).toBeVisible();
    });
  }
);
