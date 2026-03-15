/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { deleteAlertsAndRules } from '../../../common/api_helpers';
import { createRuleFromParams, resetRulesTableState } from '../../../common/rule_api_helpers';
import { getCustomQueryRuleParams } from '../../../common/rule_objects';

test.describe(
  'Rules table: persistent state',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, apiServices, kbnClient, page }) => {
      await browserAuth.loginAsAdmin();
      await resetRulesTableState(page);
      await deleteAlertsAndRules(apiServices);
      await createRuleFromParams(
        kbnClient,
        getCustomQueryRuleParams({ name: 'Persist Rule 1', rule_id: 'persist-1', enabled: false })
      );
      await createRuleFromParams(
        kbnClient,
        getCustomQueryRuleParams({ name: 'Persist Rule 2', rule_id: 'persist-2', enabled: false })
      );
    });

    test('persists search filter across navigation', async ({ pageObjects, page }) => {
      await pageObjects.rulesManagementTable.goto();
      await pageObjects.rulesManagementTable.waitForTableToLoad();
      await pageObjects.rulesManagementTable.disableAutoRefresh();

      await pageObjects.rulesManagementTable.filterBySearchTerm('Persist Rule 1');
      const rows = await pageObjects.rulesManagementTable.getTableRows();
      await expect(rows).toHaveCount(1);

      await page.goBack();
      await page.goForward();
      await pageObjects.rulesManagementTable.waitForTableToLoad();

      await expect(pageObjects.rulesManagementTable.ruleSearchField).toHaveValue('Persist Rule 1');
    });
  }
);
