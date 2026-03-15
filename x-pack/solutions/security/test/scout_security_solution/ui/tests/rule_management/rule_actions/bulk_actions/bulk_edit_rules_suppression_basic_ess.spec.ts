/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../../fixtures';
import { deleteAlertsAndRules, startBasicLicense } from '../../../../common/api_helpers';
import { createRuleFromParams, resetRulesTableState } from '../../../../common/rule_api_helpers';
import { getCustomQueryRuleParams } from '../../../../common/rule_objects';

test.describe('Bulk edit rules suppression basic ESS', { tag: [...tags.stateful.classic] }, () => {
  test.beforeEach(async ({ browserAuth, apiServices, kbnClient, page }) => {
    await browserAuth.loginAsAdmin();
    await resetRulesTableState(page);
    await deleteAlertsAndRules(apiServices);
    await startBasicLicense(kbnClient);
    await createRuleFromParams(
      kbnClient,
      getCustomQueryRuleParams({ name: 'Query rule', rule_id: '1', enabled: false })
    );
  });

  test('bulk suppression is disabled on basic license', async ({ pageObjects, page }) => {
    await pageObjects.rulesManagementTable.goto();
    await pageObjects.rulesManagementTable.waitForTableToLoad();
    await pageObjects.rulesManagementTable.disableAutoRefresh();

    await pageObjects.rulesManagementTable.selectAllRules();
    await pageObjects.rulesManagementTable.bulkActionsBtn.click();

    const suppressionItem = page.testSubj.locator('setAlertSuppressionBulk');
    await expect(suppressionItem).toBeDisabled();
  });
});
