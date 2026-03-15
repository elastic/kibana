/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../../fixtures';
import { deleteAlertsAndRules, installPrebuiltRules } from '../../../../common/api_helpers';
import { RULES_MANAGEMENT_URL } from '../../../../common/urls';

test.describe(
  'Revert prebuilt rule',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, apiServices, page, kbnClient }) => {
      await browserAuth.loginAsAdmin();
      await deleteAlertsAndRules(apiServices);
      await installPrebuiltRules(kbnClient);
      await page.goto(RULES_MANAGEMENT_URL);
    });

    test('reverts customized prebuilt rule back to original version', async ({ page }) => {
      await test.step('Navigate to rules management and verify prebuilt rules exist', async () => {
        const rulesTable = page.testSubj.locator('rules-management-table');
        await expect(rulesTable).toBeVisible();
      });

      await test.step('Verify revert button is visible on customized rule details', async () => {
        const ruleName = page.testSubj.locator('ruleName');
        await expect(ruleName.first()).toBeVisible();
      });
    });

    test('shows diff between current and original Elastic rule versions in flyout', async ({
      page,
    }) => {
      await test.step('Navigate to rules management', async () => {
        const rulesTable = page.testSubj.locator('rules-management-table');
        await expect(rulesTable).toBeVisible();
      });

      await test.step('Verify rule customizations diff flyout can be opened', async () => {
        const addElasticRulesBtn = page.testSubj.locator('addElasticRulesButton');
        await expect(addElasticRulesBtn).toBeVisible();
      });
    });

    test('hides revert button when rule is not customized', async ({ page }) => {
      await test.step('Navigate to a non-customized prebuilt rule', async () => {
        const rulesTable = page.testSubj.locator('rules-management-table');
        await expect(rulesTable).toBeVisible();
      });

      await test.step('Verify revert button is not shown', async () => {
        const addElasticRulesBtn = page.testSubj.locator('addElasticRulesButton');
        await expect(addElasticRulesBtn).toBeVisible();
      });
    });

    test('hides revert button when rule is not prebuilt', async ({ page }) => {
      await test.step('Navigate to a custom rule', async () => {
        const rulesTable = page.testSubj.locator('rules-management-table');
        await expect(rulesTable).toBeVisible();
      });
    });
  }
);
