/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { deleteAlertsAndRules } from '../../../common/api_helpers';
import { createRuleFromParams } from '../../../common/rule_api_helpers';
import { getExistingRule } from '../../../common/rule_objects';

test.describe(
  'Custom query rule - Rule Edit',
  {
    tag: [...tags.stateful.classic, ...tags.serverless.security.complete],
  },
  () => {
    test.beforeEach(async ({ browserAuth, apiServices }) => {
      await browserAuth.loginAsAdmin();
      await deleteAlertsAndRules(apiServices);
    });

    test('Edits custom query rule', async ({ page, pageObjects, kbnClient }) => {
      const existingRule = getExistingRule({ rule_id: 'rule1', enabled: true });

      await test.step('Create rule via API', async () => {
        const created = await createRuleFromParams(kbnClient, existingRule);
        await page.gotoApp(`security/rules/id/${created.id}/edit`);
      });

      await test.step('Verify define step is populated', async () => {
        const queryInput = page.testSubj.locator('queryInput');
        await expect(queryInput).toBeVisible();
      });

      await test.step('Navigate to about step and edit fields', async () => {
        const aboutTab = page.testSubj.locator('edit-rule-about-tab');
        await aboutTab.click();

        const ruleNameInput = page.testSubj.locator('ruleNameInput');
        await ruleNameInput.clear();
        await ruleNameInput.fill('Edited Rule');

        const descriptionInput = page.testSubj.locator('ruleDescriptionInput');
        await descriptionInput.clear();
        await descriptionInput.fill('Edited Rule description');
      });

      await test.step('Save changes', async () => {
        const saveBtn = page.testSubj.locator('ruleEditSubmitButton');
        await saveBtn.click();
      });

      await test.step('Verify edited rule on details page', async () => {
        const ruleNameHeader = page.testSubj.locator('header-page-title');
        await expect(ruleNameHeader).toContainText('Edited Rule');
      });
    });
  }
);
