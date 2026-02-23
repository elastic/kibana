/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../../fixtures';
import { deleteAlertsAndRules, installPrebuiltRules } from '../../../../common/api_helpers';
import { RULES_MANAGEMENT_URL, INSTALL_PREBUILT_RULES_URL } from '../../../../common/urls';

test.describe(
  'Install prebuilt rules - update authorization',
  { tag: [...tags.stateful.classic] },
  () => {
    test.beforeEach(async ({ browserAuth, apiServices, kbnClient }) => {
      await browserAuth.loginAsAdmin();
      await deleteAlertsAndRules(apiServices);
    });

    test('read-only user should not be able to install prebuilt rules', async ({ page }) => {
      await test.step('Navigate to rules management table', async () => {
        await page.goto(RULES_MANAGEMENT_URL);
      });

      await test.step('Verify Add Elastic Rules button is visible', async () => {
        const addElasticRulesBtn = page.testSubj.locator('addElasticRulesButton');
        await expect(addElasticRulesBtn).toBeVisible();
      });

      await test.step('Navigate to add rules page and verify access', async () => {
        await page.goto(INSTALL_PREBUILT_RULES_URL);
        const notFoundPage = page.testSubj.locator('notFoundPage');
        await expect(notFoundPage).toBeHidden();
      });
    });

    test('read-only user should not be able to upgrade prebuilt rules', async ({
      page,
      apiServices,
      kbnClient,
    }) => {
      await test.step('Install prebuilt rules for upgrade test', async () => {
        await installPrebuiltRules(kbnClient);
      });

      await test.step('Navigate to rules management', async () => {
        await page.goto(RULES_MANAGEMENT_URL);
      });

      await test.step('Verify Rule Updates tab visibility', async () => {
        const rulesTable = page.testSubj.locator('rules-management-table');
        await expect(rulesTable).toBeVisible();
      });
    });

    test('write user should be able to install prebuilt rules', async ({ page }) => {
      await test.step('Navigate to rules management', async () => {
        await page.goto(RULES_MANAGEMENT_URL);
      });

      await test.step('Verify Add Elastic Rules button is enabled', async () => {
        const addElasticRulesBtn = page.testSubj.locator('addElasticRulesButton');
        await expect(addElasticRulesBtn).toBeVisible();
        await expect(addElasticRulesBtn).toBeEnabled();
      });
    });

    test('write user should be able to upgrade prebuilt rules', async ({
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
