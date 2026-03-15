/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../../fixtures';
import {
  deleteAlertsAndRules,
  createConnector,
  deleteConnectors,
} from '../../../../common/api_helpers';
import { createRuleFromParams, resetRulesTableState } from '../../../../common/rule_api_helpers';
import { getCustomQueryRuleParams, getNewEqlRule } from '../../../../common/rule_objects';

test.describe(
  'Bulk edit rules actions',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, apiServices, kbnClient, page }) => {
      await browserAuth.loginAsAdmin();
      await resetRulesTableState(page);
      await deleteAlertsAndRules(apiServices);
      await deleteConnectors(kbnClient);
      await createConnector(kbnClient, {
        name: 'Slack connector',
        connector_type_id: '.slack_api',
        config: {},
        secrets: { token: 'test-token' },
      });
      await createRuleFromParams(
        kbnClient,
        getCustomQueryRuleParams({ name: 'Test rule 1', rule_id: '1', enabled: false })
      );
      await createRuleFromParams(
        kbnClient,
        getNewEqlRule({ name: 'New EQL Rule', rule_id: '2', enabled: false })
      );
    });

    test('bulk edit rule actions adds action to rules', async ({ pageObjects, page }) => {
      await pageObjects.rulesManagementTable.goto();
      await pageObjects.rulesManagementTable.waitForTableToLoad();
      await pageObjects.rulesManagementTable.disableAutoRefresh();

      await pageObjects.rulesManagementTable.selectAllRules();
      await pageObjects.rulesManagementTable.bulkActionsBtn.click();
      await page.testSubj.locator('setRuleActionsBulk').click();

      const actionsForm = page.testSubj.locator('bulkEditRuleActionsForm');
      await expect(actionsForm).toBeVisible();

      await page.testSubj.locator('bulkEditSubmitButton').click();

      const toast = page.testSubj.locator('euiToast');
      await expect(toast).toContainText('updated');
    });
  }
);
