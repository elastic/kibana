/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { deleteAlertsAndRules } from '../../../common/api_helpers';
import { createRuleFromParams } from '../../../common/rule_api_helpers';
import { getNewTermsRule } from '../../../common/rule_objects';

test.describe(
  'New terms rule - Rule Edit',
  {
    tag: [...tags.stateful.classic, ...tags.serverless.security.complete],
  },
  () => {
    test.beforeEach(async ({ browserAuth, apiServices }) => {
      await browserAuth.loginAsAdmin();
      await deleteAlertsAndRules(apiServices);
    });

    test('Edits new terms rule', async ({ page, kbnClient }) => {
      const rule = getNewTermsRule({ rule_id: 'new-terms-edit' });

      await test.step('Create new terms rule via API and navigate to edit', async () => {
        const created = await createRuleFromParams(kbnClient, rule);
        await page.gotoApp(`security/rules/id/${created.id}/edit`);
      });

      await test.step('Navigate to about step and edit name', async () => {
        const aboutTab = page.testSubj.locator('edit-rule-about-tab');
        await aboutTab.click();

        const ruleNameInput = page.testSubj.locator('ruleNameInput');
        await ruleNameInput.clear();
        await ruleNameInput.fill('Edited New Terms Rule');
      });

      await test.step('Save changes', async () => {
        const saveBtn = page.testSubj.locator('ruleEditSubmitButton');
        await saveBtn.click();
      });

      await test.step('Verify edited rule on details page', async () => {
        const ruleNameHeader = page.testSubj.locator('header-page-title');
        await expect(ruleNameHeader).toContainText('Edited New Terms Rule');
      });
    });
  }
);
