/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { deleteAlertsAndRules } from '../../../common/api_helpers';
import { createRuleFromParams } from '../../../common/rule_api_helpers';
import { getCustomQueryRuleParams } from '../../../common/rule_objects';
import { resetRulesTableState } from '../../../common/rule_api_helpers';

test.describe(
  'Rules table: selection',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, apiServices, kbnClient, page }) => {
      await browserAuth.loginAsAdmin();
      await resetRulesTableState(page);
      await deleteAlertsAndRules(apiServices);
      await createRuleFromParams(kbnClient, getCustomQueryRuleParams({ rule_id: 'rule1', enabled: false }));
    });

    test('should allow selecting rules via checkbox', async ({ pageObjects }) => {
      await pageObjects.rulesManagementTable.goto();
      await pageObjects.rulesManagementTable.waitForTableToLoad();
      await pageObjects.rulesManagementTable.selectRuleByName('New Rule Test');
      const bulkActionsBtn = pageObjects.rulesManagementTable.bulkActionsBtn;
      await expect(bulkActionsBtn).toBeEnabled();
    });

    test('should show bulk actions when rules are selected', async ({ pageObjects }) => {
      await pageObjects.rulesManagementTable.goto();
      await pageObjects.rulesManagementTable.waitForTableToLoad();
      await pageObjects.rulesManagementTable.selectRuleByName('New Rule Test');
      await pageObjects.rulesManagementTable.bulkActionsBtn.click();
      const deleteBulkBtn = pageObjects.rulesManagementTable.page.testSubj.locator('deleteRuleBulk');
      await expect(deleteBulkBtn.first()).toBeVisible({ timeout: 5_000 });
    });
  }
);
