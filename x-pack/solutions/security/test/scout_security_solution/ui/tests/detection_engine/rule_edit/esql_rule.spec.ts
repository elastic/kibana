/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { deleteAlertsAndRules } from '../../../common/api_helpers';
import { createRuleFromParams } from '../../../common/rule_api_helpers';
import { getNewEsqlRule } from '../../../common/rule_objects';

test.describe(
  'ES|QL rule - Rule Edit',
  {
    tag: [...tags.stateful.classic, ...tags.serverless.security.complete],
  },
  () => {
    test.beforeEach(async ({ browserAuth, apiServices }) => {
      await browserAuth.loginAsAdmin();
      await deleteAlertsAndRules(apiServices);
    });

    test('Edits ES|QL rule and checks details page', async ({ page, kbnClient }) => {
      const rule = getNewEsqlRule({ rule_id: 'esql-edit' });

      await test.step('Create ES|QL rule via API and navigate to edit', async () => {
        const created = await createRuleFromParams(kbnClient, rule);
        await page.gotoApp(`security/rules/id/${created.id}/edit`);
      });

      await test.step('Verify ES|QL query is displayed', async () => {
        const esqlQueryBar = page.testSubj.locator('esqlQueryBar');
        await expect(esqlQueryBar).toBeVisible();
      });

      await test.step('Save rule', async () => {
        const saveBtn = page.testSubj.locator('ruleEditSubmitButton');
        await saveBtn.click();

        const confirmModal = page.testSubj.locator('confirmModalConfirmButton');
        const isConfirmVisible = await confirmModal.isVisible().catch(() => false);
        if (isConfirmVisible) {
          await confirmModal.click();
        }
      });

      await test.step('Verify rule details page', async () => {
        const ruleNameHeader = page.testSubj.locator('header-page-title');
        await expect(ruleNameHeader).toContainText(rule.name);
      });
    });
  }
);
