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
  'Alerts page filters - alerts data modification',
  { tag: tags.deploymentAgnostic },
  () => {
    test.beforeEach(async ({ browserAuth, page, apiServices, pageObjects }) => {
      await deleteAlertsAndRules(apiServices);
      await createRule(apiServices);
      await browserAuth.loginAsAdmin();
      await page.goto(ALERTS_URL);
      await page.testSubj.locator('expand-event').waitFor({ state: 'visible', timeout: 60_000 });
    });

    test.afterAll(async ({ apiServices }) => {
      await deleteAlertsAndRules(apiServices);
    });

    test('should update alert status list when the alerts are updated', async ({
      page,
      pageObjects,
    }) => {
      const alertsCount = page.testSubj.locator('toolbar-alerts-count');
      await expect(alertsCount).toBeVisible();

      await test.step('Mark first alert as acknowledged', async () => {
        const firstCheckbox = page.testSubj
          .locator('bulk-actions-row-cell')
          .locator('.euiCheckbox__input')
          .nth(0);
        await firstCheckbox.check();
        await page.testSubj.locator('selectedShowBulkActionsButton').click();
        await page.testSubj.locator('acknowledged-alert-status').click();
        await page.testSubj
          .locator('events-container-loading-false')
          .waitFor({ state: 'visible', timeout: 60_000 });
      });

      await test.step('Select acknowledged in page filter and verify count', async () => {
        const firstFilterControl = pageObjects.alertFilters.getOptionListControl(0);
        await firstFilterControl.click();

        const acknowledgedOption = page.testSubj.locator(
          'optionsList-control-selection-acknowledged'
        );
        await acknowledgedOption.click();

        await page.keyboard.press('Escape');

        await page.testSubj
          .locator('events-container-loading-false')
          .waitFor({ state: 'visible', timeout: 60_000 });

        await expect(alertsCount).toContainText('1');
      });
    });
  }
);
