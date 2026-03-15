/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { deleteAlertsAndRules } from '../../../common/api_helpers';
import { createRuleFromParams } from '../../../common/rule_api_helpers';
import { getNewEqlRule } from '../../../common/rule_objects';

test.describe(
  'EQL query rule - Rule Edit',
  {
    tag: [...tags.stateful.classic, ...tags.serverless.security.complete],
  },
  () => {
    test.beforeEach(async ({ browserAuth, apiServices }) => {
      await browserAuth.loginAsAdmin();
      await deleteAlertsAndRules(apiServices);
    });

    test('Edits EQL rule and saves with non-blocking errors', async ({ page, kbnClient }) => {
      await test.step('Create EQL rule with fake index via API', async () => {
        const rule = getNewEqlRule({ rule_id: 'eql-edit', index: ['fake*'] });
        const created = await createRuleFromParams(kbnClient, rule);
        await page.gotoApp(`security/rules/id/${created.id}/edit`);
      });

      await test.step('Save edited rule', async () => {
        const saveBtn = page.testSubj.locator('ruleEditSubmitButton');
        await saveBtn.click();

        const confirmModal = page.testSubj.locator('confirmModalConfirmButton');
        const isConfirmVisible = await confirmModal.isVisible().catch(() => false);
        if (isConfirmVisible) {
          await confirmModal.click();
        }
      });

      await test.step('Verify rule is saved', async () => {
        const ruleNameHeader = page.testSubj.locator('header-page-title');
        await expect(ruleNameHeader).toBeVisible();
      });
    });

    test('Edits EQL rule with unknown field and saves', async ({ page, kbnClient }) => {
      await test.step('Create EQL rule with unknown field via API', async () => {
        const rule = getNewEqlRule({ rule_id: 'eql-edit-field', query: 'any where hello.world' });
        const created = await createRuleFromParams(kbnClient, rule);
        await page.gotoApp(`security/rules/id/${created.id}/edit`);
      });

      await test.step('Save edited rule', async () => {
        const saveBtn = page.testSubj.locator('ruleEditSubmitButton');
        await saveBtn.click();

        const confirmModal = page.testSubj.locator('confirmModalConfirmButton');
        const isConfirmVisible = await confirmModal.isVisible().catch(() => false);
        if (isConfirmVisible) {
          await confirmModal.click();
        }
      });

      await test.step('Verify rule is saved', async () => {
        const ruleNameHeader = page.testSubj.locator('header-page-title');
        await expect(ruleNameHeader).toBeVisible();
      });
    });
  }
);
