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

test.describe('Rules table - privileges', { tag: [...tags.stateful.classic] }, () => {
  test.beforeEach(async ({ apiServices, kbnClient }) => {
    await deleteAlertsAndRules(apiServices);
    await createRuleFromParams(
      kbnClient,
      getCustomQueryRuleParams({ name: 'My rule', rule_id: 'priv-rule-1', enabled: false })
    );
  });

  test('admin user can see bulk actions and enable/disable rules', async ({
    browserAuth,
    pageObjects,
  }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.rulesManagementTable.goto();
    await pageObjects.rulesManagementTable.waitForTableToLoad();

    await expect(pageObjects.rulesManagementTable.ruleName).toBeVisible();
    await expect(pageObjects.rulesManagementTable.ruleSwitch).toBeVisible();
    await expect(pageObjects.rulesManagementTable.bulkActionsBtn).toBeVisible();
  });

  test('viewer user sees rules but cannot modify them', async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsViewer();
    await pageObjects.rulesManagementTable.goto();
    await pageObjects.rulesManagementTable.waitForTableToLoad();

    await expect(pageObjects.rulesManagementTable.ruleName).toBeVisible();
  });
});
