/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { deleteAlertsAndRules } from '../../../common/api_helpers';
import { createRuleFromParams } from '../../../common/rule_api_helpers';
import { getNewThresholdRule } from '../../../common/rule_objects';
import { RULES_MANAGEMENT_URL } from '../../../common/urls';

test.describe(
  'Threshold rule - Rule Edit',
  {
    tag: [...tags.stateful.classic, ...tags.serverless.security.complete],
  },
  () => {
    test.beforeEach(async ({ browserAuth, apiServices }) => {
      await browserAuth.loginAsAdmin();
      await deleteAlertsAndRules(apiServices);
    });

    test('Edits threshold rule', async ({ page, pageObjects, kbnClient }) => {
      const rule = getNewThresholdRule({ rule_id: 'threshold-edit' });

      await test.step('Create threshold rule via API', async () => {
        await createRuleFromParams(kbnClient, rule);
      });

      await test.step('Navigate to rules management and edit first rule', async () => {
        await page.goto(RULES_MANAGEMENT_URL);
        await pageObjects.rulesManagementTable.waitForTableToLoad();

        const collapsedActionBtn = page.testSubj.locator('euiCollapsedItemActionsButton').first();
        await collapsedActionBtn.click();
        const editAction = page.testSubj.locator('editRuleAction');
        await editAction.click();
      });

      await test.step('Navigate to about step and edit name', async () => {
        const aboutTab = page.testSubj.locator('edit-rule-about-tab');
        await aboutTab.click();

        const ruleNameInput = page.testSubj.locator('ruleNameInput');
        await ruleNameInput.clear();
        await ruleNameInput.fill('Edited Threshold Rule');
      });

      await test.step('Save changes', async () => {
        const saveBtn = page.testSubj.locator('ruleEditSubmitButton');
        await saveBtn.click();
      });

      await test.step('Verify edited rule on details page', async () => {
        const ruleNameHeader = page.testSubj.locator('header-page-title');
        await expect(ruleNameHeader).toContainText('Edited Threshold Rule');
      });
    });
  }
);
