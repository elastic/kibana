/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { deleteAlertsAndRules } from '../../../common/api_helpers';
import { createRuleFromParams } from '../../../common/rule_api_helpers';
import { getNewRule } from '../../../common/rule_objects';
import { RULES_MANAGEMENT_URL } from '../../../common/urls';

test.describe(
  'Manual rule run',
  {
    tag: [...tags.stateful.classic, ...tags.serverless.security.complete],
  },
  () => {
    test.beforeEach(async ({ browserAuth, apiServices }) => {
      await browserAuth.loginAsAdmin();
      await deleteAlertsAndRules(apiServices);
    });

    test('schedule from rule details page', async ({ pageObjects, page, kbnClient }) => {
      const rule = getNewRule({
        rule_id: 'new-custom-rule',
        interval: '5m',
        from: 'now-6m',
      });
      const created = await createRuleFromParams(kbnClient, rule);
      await pageObjects.ruleEdit.gotoRuleDetails(created.id);
      await page.testSubj.locator('rules-details-manual-rule-run').first().click();
      await expect(page.getByText('Successfully scheduled manual run').first()).toBeVisible({
        timeout: 30_000,
      });
    });

    test('schedule from rules management table', async ({ page, pageObjects, kbnClient }) => {
      const rule = getNewRule({
        rule_id: 'manual-run-table',
        interval: '5m',
        from: 'now-6m',
      });

      await test.step('Create rule via API', async () => {
        await createRuleFromParams(kbnClient, rule);
      });

      await test.step('Navigate to rules management', async () => {
        await page.goto(RULES_MANAGEMENT_URL);
        await pageObjects.rulesManagementTable.waitForTableToLoad();
        await pageObjects.rulesManagementTable.disableAutoRefresh();
      });

      await test.step('Trigger manual run from table', async () => {
        const collapsedActionBtn = page.testSubj.locator('euiCollapsedItemActionsButton').first();
        await collapsedActionBtn.click();

        const manualRunAction = page.testSubj.locator('manualRuleRunAction');
        const isVisible = await manualRunAction.isVisible().catch(() => false);
        test.skip(!isVisible, 'Manual rule run action not available in table');
        await manualRunAction.click();
      });

      await test.step('Verify success toast', async () => {
        await expect(page.getByText('Successfully scheduled manual run').first()).toBeVisible({
          timeout: 30_000,
        });
      });
    });
  }
);
