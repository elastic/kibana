/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../../fixtures';
import { deleteAlertsAndRules } from '../../../../common/api_helpers';
import { createRuleFromParams, resetRulesTableState } from '../../../../common/rule_api_helpers';
import { getCustomQueryRuleParams } from '../../../../common/rule_objects';

test.describe('Bulk edit rules data view', { tag: [...tags.stateful.classic] }, () => {
  test.beforeEach(async ({ browserAuth, apiServices, kbnClient, page }) => {
    await browserAuth.loginAsAdmin();
    await resetRulesTableState(page);
    await deleteAlertsAndRules(apiServices);
    await createRuleFromParams(
      kbnClient,
      getCustomQueryRuleParams({
        name: 'Rule with index patterns',
        rule_id: '1',
        index: ['index-1-*', 'index-2-*'],
        enabled: false,
      })
    );
  });

  test('bulk edit rule data view adds index patterns', async ({ pageObjects, page }) => {
    await pageObjects.rulesManagementTable.goto();
    await pageObjects.rulesManagementTable.waitForTableToLoad();
    await pageObjects.rulesManagementTable.disableAutoRefresh();

    await pageObjects.rulesManagementTable.selectAllRules();
    await pageObjects.rulesManagementTable.bulkActionsBtn.click();
    await page.testSubj.locator('indexPatternsBulk').click();

    const form = page.testSubj.locator('bulkEditRulesForm');
    await expect(form).toBeVisible();

    const indexPatternInput = form.locator('input[type="text"]').first();
    await indexPatternInput.fill('new-index-*');
    await indexPatternInput.press('Enter');
    await page.testSubj.locator('bulkEditSubmitButton').click();

    const toast = page.testSubj.locator('euiToast');
    await expect(toast).toContainText('updated');
  });
});
