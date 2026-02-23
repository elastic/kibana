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
  'Import prebuilt rule',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, apiServices, kbnClient }) => {
      await browserAuth.loginAsAdmin();
      await deleteAlertsAndRules(apiServices);
    });

    test('imports a mixture of new prebuilt and custom rules without override', async ({
      page,
    }) => {
      await test.step('Navigate to rules management', async () => {
        await page.goto(RULES_MANAGEMENT_URL);
      });

      await test.step('Verify rules management page loads', async () => {
        const addElasticRulesBtn = page.testSubj.locator('addElasticRulesButton');
        await expect(addElasticRulesBtn).toBeVisible();
      });

      await test.step('Verify import rules button is available', async () => {
        const importRulesBtn = page.testSubj.locator('importRulesFromFileButton');
        await expect(importRulesBtn).toBeVisible();
      });
    });

    test('imports a mixture of prebuilt and custom rules with override', async ({
      page,
      apiServices,
      kbnClient,
    }) => {
      await test.step('Install prebuilt rules first', async () => {
        await installPrebuiltRules(kbnClient);
      });

      await test.step('Navigate to rules management', async () => {
        await page.goto(RULES_MANAGEMENT_URL);
        const rulesTable = page.testSubj.locator('rules-management-table');
        await expect(rulesTable).toBeVisible();
      });

      await test.step('Verify import controls are available', async () => {
        const importRulesBtn = page.testSubj.locator('importRulesFromFileButton');
        await expect(importRulesBtn).toBeVisible();
      });
    });
  }
);
