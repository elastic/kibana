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

test.describe('Rules table: links', { tag: [...tags.stateful.classic] }, () => {
  test.beforeEach(async ({ browserAuth, apiServices, kbnClient, page }) => {
    await browserAuth.loginAsAdmin();
    await resetRulesTableState(page);
    await deleteAlertsAndRules(apiServices);
    await createRuleFromParams(
      kbnClient,
      getCustomQueryRuleParams({ rule_id: 'rule1', enabled: false })
    );
  });

  test('should render correct link for rule name - rules', async ({ pageObjects, page }) => {
    await pageObjects.rulesManagementTable.goto();
    await pageObjects.rulesManagementTable.waitForTableToLoad();
    await pageObjects.rulesManagementTable.ruleName.first().click();
    await expect(page).toHaveURL(/rules\/id\//);
  });

  test('should render correct link for rule name - rule monitoring', async ({
    pageObjects,
    page,
  }) => {
    await pageObjects.rulesManagementTable.goto();
    await pageObjects.rulesManagementTable.waitForTableToLoad();
    await pageObjects.rulesManagementTable.rulesMonitoringTab.click();
    await pageObjects.rulesManagementTable.ruleName.first().click();
    await expect(page).toHaveURL(/rules\/id\//);
  });
});
