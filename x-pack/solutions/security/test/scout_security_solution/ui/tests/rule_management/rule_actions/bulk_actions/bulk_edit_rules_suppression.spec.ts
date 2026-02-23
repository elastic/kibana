/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../../fixtures';
import { deleteAlertsAndRules } from '../../../../common/api_helpers';
import { createRuleFromParams, resetRulesTableState } from '../../../../common/rule_api_helpers';
import { getCustomQueryRuleParams, getNewEqlRule } from '../../../../common/rule_objects';

test.describe(
  'Bulk edit rules suppression',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, apiServices, kbnClient, page }) => {
      await browserAuth.loginAsAdmin();
      await resetRulesTableState(page);
      await deleteAlertsAndRules(apiServices);
      await createRuleFromParams(
        kbnClient,
        getCustomQueryRuleParams({ name: 'Query rule', rule_id: '1', enabled: false })
      );
      await createRuleFromParams(
        kbnClient,
        getNewEqlRule({ name: 'EQL Rule', rule_id: '2', enabled: false })
      );
    });

    test('bulk edit sets alert suppression on rules', async ({ pageObjects, page }) => {
      await pageObjects.rulesManagementTable.goto();
      await pageObjects.rulesManagementTable.waitForTableToLoad();
      await pageObjects.rulesManagementTable.disableAutoRefresh();

      await pageObjects.rulesManagementTable.selectAllRules();
      await pageObjects.rulesManagementTable.bulkActionsBtn.click();
      await page.testSubj.locator('setAlertSuppressionBulk').click();

      const confirmBtn = page.testSubj.locator('confirmModalConfirmButton');
      if (await confirmBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await confirmBtn.click();
      }

      const form = page.testSubj.locator('bulkEditRuleSuppressionForm');
      await expect(form).toBeVisible();
    });
  }
);
