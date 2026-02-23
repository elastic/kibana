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

test.describe('Rule details - privileges', { tag: [...tags.stateful.classic] }, () => {
  test.beforeEach(async ({ apiServices, kbnClient }) => {
    await deleteAlertsAndRules(apiServices);
    await createRuleFromParams(
      kbnClient,
      getCustomQueryRuleParams({ name: 'Privileges test rule', rule_id: 'priv-1', enabled: false })
    );
  });

  test('admin user can see rule details and actions', async ({
    browserAuth,
    pageObjects,
    page,
    kbnClient,
  }) => {
    await browserAuth.loginAsAdmin();

    const ruleResp = await createRuleFromParams(
      kbnClient,
      getCustomQueryRuleParams({ name: 'Admin rule', rule_id: 'admin-priv-1', enabled: false })
    );

    await pageObjects.ruleDetails.goto(ruleResp.id);
    await pageObjects.ruleDetails.waitForPageToLoad('Admin rule');

    await expect(pageObjects.ruleDetails.ruleNameHeader).toContainText('Admin rule');
    await expect(pageObjects.ruleDetails.ruleSwitch).toBeVisible();
    await expect(pageObjects.ruleDetails.popoverActionsTrigger).toBeVisible();
  });

  test('viewer user can see rule details but not edit actions', async ({
    browserAuth,
    pageObjects,
    kbnClient,
  }) => {
    await browserAuth.loginAsViewer();

    await pageObjects.rulesManagementTable.goto();
    await pageObjects.rulesManagementTable.waitForTableToLoad();

    await expect(pageObjects.rulesManagementTable.ruleName).toBeVisible();
  });
});
