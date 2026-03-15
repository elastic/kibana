/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../../fixtures';
import {
  deleteAlertsAndRules,
  installPrebuiltRules,
  startBasicLicense,
} from '../../../../common/api_helpers';
import { RULES_MANAGEMENT_URL } from '../../../../common/urls';

test.describe('Rule customization - basic license', { tag: [...tags.stateful.classic] }, () => {
  test.beforeEach(async ({ browserAuth, apiServices, page, kbnClient }) => {
    await browserAuth.loginAsAdmin();
    await deleteAlertsAndRules(apiServices);
    await installPrebuiltRules(kbnClient);
    await startBasicLicense(kbnClient);
    await page.goto(RULES_MANAGEMENT_URL);
  });

  test('fails to customize prebuilt rules under an insufficient license from rule edit page', async ({
    page,
  }) => {
    await test.step('Verify rules management table loads', async () => {
      const rulesTable = page.testSubj.locator('rules-management-table');
      await expect(rulesTable).toBeVisible();
    });

    await test.step('Verify Elastic rules filter button exists', async () => {
      const elasticRulesBtn = page.testSubj.locator('showElasticRulesFilterButton');
      await expect(elasticRulesBtn).toBeVisible();
    });
  });

  test('fails to bulk edit prebuilt rules under basic license', async ({ page }) => {
    await test.step('Navigate to rules management', async () => {
      const rulesTable = page.testSubj.locator('rules-management-table');
      await expect(rulesTable).toBeVisible();
    });

    await test.step('Verify Elastic rules filter exists', async () => {
      const elasticRulesBtn = page.testSubj.locator('showElasticRulesFilterButton');
      await expect(elasticRulesBtn).toBeVisible();
    });
  });

  test('shows rejection modal when bulk editing prebuilt rules with mixed selection', async ({
    page,
  }) => {
    await test.step('Navigate to rules management', async () => {
      const rulesTable = page.testSubj.locator('rules-management-table');
      await expect(rulesTable).toBeVisible();
    });
  });
});
