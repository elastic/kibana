/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { deleteAlertsAndRules, deleteGapAutoFillScheduler } from '../../../common/api_helpers';
import { createRuleFromParams } from '../../../common/rule_api_helpers';
import { getCustomQueryRuleParams } from '../../../common/rule_objects';
import { RULES_MANAGEMENT_URL } from '../../../common/urls';

test.describe(
  'Rule gaps auto fill status',
  {
    tag: tags.stateful.classic,
  },
  () => {
    test.describe('Platinum user flows', () => {
      test.beforeEach(async ({ browserAuth, apiServices, kbnClient }) => {
        await browserAuth.loginAsAdmin();
        await deleteAlertsAndRules(apiServices);
        await deleteGapAutoFillScheduler(kbnClient);
        await createRuleFromParams(
          kbnClient,
          getCustomQueryRuleParams({
            rule_id: '1',
            name: 'Rule 1',
            interval: '1m',
            from: 'now-1m',
          })
        );
      });

      test.afterEach(async ({ kbnClient }) => {
        await deleteGapAutoFillScheduler(kbnClient);
      });

      test('Enable and disable auto gap fill', async ({ page, pageObjects }) => {
        const { rulesManagementTable, ruleGaps } = pageObjects;

        await test.step('Navigate to monitoring tab', async () => {
          await page.goto(RULES_MANAGEMENT_URL);
          await rulesManagementTable.waitForTableToLoad();
          await ruleGaps.gotoMonitoringTab();
          await expect(ruleGaps.gapsOverviewPanel).toBeVisible();
        });

        await test.step('Enable auto gap fill', async () => {
          await ruleGaps.openGapAutoFillSettings();
          await ruleGaps.enableAutoFill();
          await ruleGaps.saveGapAutoFillSettings();
          await expect(page.testSubj.locator('globalToastList')).toContainText(
            'Auto gap fill settings updated successfully'
          );
        });

        await test.step('Disable auto gap fill', async () => {
          await ruleGaps.openGapAutoFillSettings();
          await expect(ruleGaps.settingsEnableSwitch).toBeChecked();
          await ruleGaps.disableAutoFill();
          await ruleGaps.saveGapAutoFillSettings();
          await expect(page.testSubj.locator('globalToastList')).toContainText(
            'Auto gap fill settings updated successfully'
          );
        });
      });

      test('View gap fill scheduler logs and filter by status', async ({ page, pageObjects }) => {
        const { rulesManagementTable, ruleGaps } = pageObjects;

        await test.step('Navigate to monitoring tab and enable auto fill', async () => {
          await page.goto(RULES_MANAGEMENT_URL);
          await rulesManagementTable.waitForTableToLoad();
          await ruleGaps.gotoMonitoringTab();
          await ruleGaps.openGapAutoFillSettings();
          await ruleGaps.enableAutoFill();
          await ruleGaps.saveGapAutoFillSettings();
        });

        await test.step('Open gap fill logs flyout', async () => {
          await ruleGaps.openGapAutoFillSettings();
          await ruleGaps.openGapLogsFlyout();
          await expect(ruleGaps.logsFlyout).toBeVisible();
          await expect(ruleGaps.logsTable).toBeVisible();
        });

        await test.step('Filter logs by status', async () => {
          await ruleGaps.logsStatusFilterPopoverButton.click();
          const filterItem = page.testSubj.locator('gap-auto-fill-logs-status-filter-item');
          await expect(filterItem).toBeVisible();
          await filterItem.filter({ hasText: 'Success' }).click();
          await filterItem.filter({ hasText: 'Error' }).click();
          await filterItem.filter({ hasText: 'No gaps' }).click();
          await page.keyboard.press('Escape');
          await expect(ruleGaps.logsTable).toBeVisible();
        });
      });
    });

    test.describe('Read-only user', () => {
      test.beforeEach(async ({ browserAuth, apiServices, kbnClient }) => {
        await browserAuth.loginAsAdmin();
        await deleteAlertsAndRules(apiServices);
        await deleteGapAutoFillScheduler(kbnClient);
        await createRuleFromParams(
          kbnClient,
          getCustomQueryRuleParams({
            rule_id: '1',
            name: 'Rule 1',
            interval: '1m',
            from: 'now-1m',
          })
        );
      });

      test.afterEach(async ({ kbnClient }) => {
        await deleteGapAutoFillScheduler(kbnClient);
      });

      test('shows the modal but disables edits for users without CRUD permissions', async ({
        page,
        pageObjects,
        browserAuth,
      }) => {
        const { rulesManagementTable, ruleGaps } = pageObjects;

        await test.step('Enable auto gap fill as admin first', async () => {
          await page.goto(RULES_MANAGEMENT_URL);
          await rulesManagementTable.waitForTableToLoad();
          await ruleGaps.gotoMonitoringTab();
          await ruleGaps.openGapAutoFillSettings();
          await ruleGaps.enableAutoFill();
          await ruleGaps.saveGapAutoFillSettings();
        });

        await test.step('Login as viewer and verify read-only state', async () => {
          await browserAuth.loginAsViewer();
          await page.goto(RULES_MANAGEMENT_URL);
          await rulesManagementTable.waitForTableToLoad();
          await ruleGaps.gotoMonitoringTab();
          await ruleGaps.autoFillStatusBadge.click();
          await expect(ruleGaps.settingsModal).toBeVisible();
          await expect(ruleGaps.settingsEnableSwitch).toBeDisabled();
          await expect(ruleGaps.settingsSaveButton).toBeDisabled();
        });
      });
    });
  }
);
