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
  'Install prebuilt rules - notifications',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, apiServices, kbnClient }) => {
      await browserAuth.loginAsAdmin();
      await deleteAlertsAndRules(apiServices);
    });

    test('does NOT display install notifications when no rules are installed', async ({ page }) => {
      await test.step('Navigate to rules management table', async () => {
        await page.goto(RULES_MANAGEMENT_URL);
        const addElasticRulesBtn = page.testSubj.locator('addElasticRulesButton');
        await expect(addElasticRulesBtn).toBeVisible();
      });

      await test.step('Verify "Add Elastic rules" button has no counter', async () => {
        const addElasticRulesBtn = page.testSubj.locator('addElasticRulesButton');
        await expect(addElasticRulesBtn).toContainText('Add Elastic rules');
      });
    });

    test('does NOT display install notifications when latest rules are installed', async ({
      page,
      apiServices,
      kbnClient,
    }) => {
      await test.step('Install all prebuilt rules', async () => {
        await installPrebuiltRules(kbnClient);
      });

      await test.step('Navigate to rules management', async () => {
        await page.goto(RULES_MANAGEMENT_URL);
        const addElasticRulesBtn = page.testSubj.locator('addElasticRulesButton');
        await expect(addElasticRulesBtn).toBeVisible();
        await expect(addElasticRulesBtn).toContainText('Add Elastic rules');
      });
    });

    test('notifies user about prebuilt rules available for installation', async ({ page }) => {
      await test.step('Navigate to rules management table', async () => {
        await page.goto(RULES_MANAGEMENT_URL);
      });

      await test.step('Verify Add Elastic rules button is visible', async () => {
        const addElasticRulesBtn = page.testSubj.locator('addElasticRulesButton');
        await expect(addElasticRulesBtn).toBeVisible();
      });
    });

    test('notifies user a rule is again available for installation after deletion', async ({
      page,
      apiServices,
      kbnClient,
    }) => {
      await test.step('Install prebuilt rules', async () => {
        await installPrebuiltRules(kbnClient);
      });

      await test.step('Navigate to rules management', async () => {
        await page.goto(RULES_MANAGEMENT_URL);
        const rulesTable = page.testSubj.locator('rules-management-table');
        await expect(rulesTable).toBeVisible();
      });
    });
  }
);
