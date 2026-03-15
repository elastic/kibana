/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../../fixtures';
import { deleteAlertsAndRules } from '../../../../common/api_helpers';
import { createRuleFromParams, resetRulesTableState } from '../../../../common/rule_api_helpers';
import { getCustomQueryRuleParams, getNewEqlRule } from '../../../../common/rule_objects';

const RULE_NAME = 'Custom rule for bulk actions';
const prePopulatedTags = ['test-default-tag-1', 'test-default-tag-2'];

test.describe(
  'Bulk edit rules',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, apiServices, kbnClient, page }) => {
      await browserAuth.loginAsAdmin();
      await resetRulesTableState(page);
      await deleteAlertsAndRules(apiServices);
      await createRuleFromParams(
        kbnClient,
        getCustomQueryRuleParams({
          name: RULE_NAME,
          rule_id: '1',
          tags: prePopulatedTags,
          enabled: false,
        })
      );
      await createRuleFromParams(
        kbnClient,
        getNewEqlRule({
          name: 'New EQL Rule',
          rule_id: '2',
          tags: prePopulatedTags,
          enabled: false,
        })
      );
    });

    test('bulk edit updates selected rules tags', async ({ pageObjects, page }) => {
      await pageObjects.rulesManagementTable.goto();
      await pageObjects.rulesManagementTable.waitForTableToLoad();
      await pageObjects.rulesManagementTable.disableAutoRefresh();

      await test.step('Select all rules and add tags via bulk edit', async () => {
        await pageObjects.rulesManagementTable.selectAllRules();
        await pageObjects.rulesManagementTable.bulkActionsBtn.click();
        await page.testSubj.locator('addTagsBulk').click();

        const tagsCombo = page.testSubj.locator('rulesBulkEditTagsForm');
        await tagsCombo.locator('input').fill('new-tag-1');
        await tagsCombo.locator('input').press('Enter');

        await page.testSubj.locator('bulkEditSubmitButton').click();
      });

      await test.step('Verify bulk edit completed', async () => {
        const toast = page.testSubj.locator('euiToast');
        await expect(toast).toContainText('updated');
      });
    });
  }
);
