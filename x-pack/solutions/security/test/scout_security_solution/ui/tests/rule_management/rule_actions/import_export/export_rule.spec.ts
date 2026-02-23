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

const RULE_NAME = 'Rule to export';

test.describe(
  'Export rule',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, apiServices, kbnClient, page }) => {
      await browserAuth.loginAsAdmin();
      await resetRulesTableState(page);
      await deleteAlertsAndRules(apiServices);
      await createRuleFromParams(
        kbnClient,
        getCustomQueryRuleParams({ name: RULE_NAME, rule_id: 'export-test', enabled: false })
      );
    });

    test('exports a custom rule from the rules table', async ({ pageObjects, page }) => {
      await pageObjects.rulesManagementTable.goto();
      await pageObjects.rulesManagementTable.waitForTableToLoad();
      await pageObjects.rulesManagementTable.disableAutoRefresh();

      const [download] = await Promise.all([
        page.waitForEvent('download'),
        (async () => {
          await pageObjects.rulesManagementTable.clickRowActions(RULE_NAME);
          await page.testSubj.locator('exportRuleAction').click();
        })(),
      ]);

      expect(download.suggestedFilename()).toContain('rules_export');
    });

    test('exports a rule from the rule details page', async ({ pageObjects, page, kbnClient }) => {
      const ruleResp = await createRuleFromParams(
        kbnClient,
        getCustomQueryRuleParams({
          name: 'Detail Export Rule',
          rule_id: 'detail-export',
          enabled: false,
        })
      );

      await pageObjects.ruleDetails.goto(ruleResp.id);
      await pageObjects.ruleDetails.waitForPageToLoad('Detail Export Rule');

      const [download] = await Promise.all([
        page.waitForEvent('download'),
        pageObjects.ruleDetails.exportRule(),
      ]);

      expect(download.suggestedFilename()).toContain('rules_export');
    });
  }
);
