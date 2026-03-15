/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { deleteAlertsAndRules } from '../../../common/api_helpers';
import { createRuleFromParams } from '../../../common/rule_api_helpers';
import { getNewRule } from '../../../common/rule_objects';
import { RULES_MANAGEMENT_URL } from '../../../common/urls';

test.describe(
  'Bulk manual rule run',
  {
    tag: [...tags.stateful.classic, ...tags.serverless.security.complete],
  },
  () => {
    test.beforeEach(async ({ browserAuth, apiServices, kbnClient }) => {
      await browserAuth.loginAsAdmin();
      await deleteAlertsAndRules(apiServices);

      const defaultValues = { enabled: true, interval: '5m', from: 'now-6m' };
      await createRuleFromParams(
        kbnClient,
        getNewRule({ rule_id: '1', name: 'Rule 1', ...defaultValues })
      );
      await createRuleFromParams(
        kbnClient,
        getNewRule({ rule_id: '2', name: 'Rule 2', ...defaultValues })
      );
      await createRuleFromParams(
        kbnClient,
        getNewRule({ rule_id: '3', name: 'Rule 3', ...defaultValues, enabled: false })
      );
      await createRuleFromParams(
        kbnClient,
        getNewRule({ rule_id: '4', name: 'Rule 4', ...defaultValues })
      );
      await createRuleFromParams(
        kbnClient,
        getNewRule({ rule_id: '5', name: 'Rule 5', ...defaultValues, enabled: false })
      );
    });

    test('schedule enabled rules for manual run', async ({ page, pageObjects }) => {
      const { rulesManagementTable } = pageObjects;

      await page.goto(RULES_MANAGEMENT_URL);
      await rulesManagementTable.waitForTableToLoad();
      await rulesManagementTable.disableAutoRefresh();

      await test.step('Select enabled rules and trigger manual run', async () => {
        await rulesManagementTable.selectRulesByName(['Rule 1', 'Rule 2', 'Rule 4']);
        await rulesManagementTable.bulkActionsBtn.click();

        const manualRunAction = page.testSubj.locator('scheduleRuleRunBulk');
        await manualRunAction.click();

        const confirmBtn = page.testSubj.locator('confirmModalConfirmButton');
        await confirmBtn.click();
      });

      await test.step('Verify success toast', async () => {
        await expect(page.testSubj.locator('globalToastList')).toContainText(
          'Successfully scheduled manual rule run for 3 rule'
        );
      });
    });

    test('schedule enabled rules and show warning about disabled rules', async ({
      page,
      pageObjects,
    }) => {
      const { rulesManagementTable } = pageObjects;

      await page.goto(RULES_MANAGEMENT_URL);
      await rulesManagementTable.waitForTableToLoad();
      await rulesManagementTable.disableAutoRefresh();

      await test.step('Select all rules including disabled and trigger manual run', async () => {
        await rulesManagementTable.selectRulesByName([
          'Rule 1',
          'Rule 2',
          'Rule 3',
          'Rule 4',
          'Rule 5',
        ]);
        await rulesManagementTable.bulkActionsBtn.click();

        const manualRunAction = page.testSubj.locator('scheduleRuleRunBulk');
        await manualRunAction.click();

        const confirmBtn = page.testSubj.locator('confirmModalConfirmButton');
        await confirmBtn.click();
      });

      await test.step('Verify success for enabled rules', async () => {
        await expect(page.testSubj.locator('globalToastList')).toContainText(
          'Successfully scheduled manual rule run for 3 rule'
        );
      });
    });

    test('show partial error for disabled rules when all rules selected', async ({
      page,
      pageObjects,
    }) => {
      const { rulesManagementTable } = pageObjects;

      await page.goto(RULES_MANAGEMENT_URL);
      await rulesManagementTable.waitForTableToLoad();
      await rulesManagementTable.disableAutoRefresh();

      await test.step('Select all rules and trigger manual run', async () => {
        await rulesManagementTable.selectAllRules();
        await rulesManagementTable.bulkActionsBtn.click();

        const manualRunAction = page.testSubj.locator('scheduleRuleRunBulk');
        await manualRunAction.click();

        const confirmBtn = page.testSubj.locator('confirmModalConfirmButton');
        await confirmBtn.click();
      });

      await test.step('Verify error toast for disabled rules', async () => {
        await expect(page.testSubj.locator('globalToastList')).toContainText(
          'failed to schedule manual rule run'
        );
      });

      await test.step('Click error toast to see details', async () => {
        const errorToastBtn = page.testSubj
          .locator('globalToastList')
          .getByRole('button', { name: /full error/i });
        await errorToastBtn.click();
        const errorModal = page.testSubj.locator('errorModalBody');
        await expect(errorModal).toContainText(
          'Cannot schedule manual rule run for a disabled rule'
        );
      });
    });
  }
);
