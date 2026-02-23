/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { deleteAlertsAndRules } from '../../../common/api_helpers';
import { createRuleFromParams, resetRulesTableState } from '../../../common/rule_api_helpers';
import { getCustomQueryRuleParams, getNewEqlRule } from '../../../common/rule_objects';

test.describe(
  'Rules table: filtering',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, apiServices, kbnClient, page }) => {
      await browserAuth.loginAsAdmin();
      await resetRulesTableState(page);
      await deleteAlertsAndRules(apiServices);
      await createRuleFromParams(
        kbnClient,
        getCustomQueryRuleParams({
          name: 'Tagged Rule',
          rule_id: 'filter-1',
          tags: ['test-tag-alpha'],
          enabled: false,
        })
      );
      await createRuleFromParams(
        kbnClient,
        getNewEqlRule({
          name: 'EQL Filter Rule',
          rule_id: 'filter-2',
          tags: ['test-tag-beta'],
          enabled: false,
        })
      );
    });

    test('Filters rules by search term', async ({ pageObjects }) => {
      await pageObjects.rulesManagementTable.goto();
      await pageObjects.rulesManagementTable.waitForTableToLoad();
      await pageObjects.rulesManagementTable.disableAutoRefresh();

      await pageObjects.rulesManagementTable.filterBySearchTerm('Tagged Rule');
      const rows = await pageObjects.rulesManagementTable.getTableRows();
      await expect(rows).toHaveCount(1);
    });

    test('Filters rules by tags', async ({ pageObjects }) => {
      await pageObjects.rulesManagementTable.goto();
      await pageObjects.rulesManagementTable.waitForTableToLoad();
      await pageObjects.rulesManagementTable.disableAutoRefresh();

      await pageObjects.rulesManagementTable.filterByTags(['test-tag-alpha']);
      const rows = await pageObjects.rulesManagementTable.getTableRows();
      await expect(rows).toHaveCount(1);
    });
  }
);
