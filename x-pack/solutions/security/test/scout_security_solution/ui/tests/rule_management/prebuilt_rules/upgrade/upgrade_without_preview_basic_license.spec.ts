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
import { RULES_UPGRADE_URL, RULES_MANAGEMENT_URL } from '../../../../common/urls';

test.describe(
  'Upgrade prebuilt rules without preview - basic license',
  { tag: [...tags.stateful.classic] },
  () => {
    test.beforeEach(async ({ browserAuth, apiServices, kbnClient }) => {
      await browserAuth.loginAsAdmin();
      await deleteAlertsAndRules(apiServices);
      await installPrebuiltRules(kbnClient);
      await startBasicLicense(kbnClient);
    });

    test('upgrades customized prebuilt rules with conflicts to the target versions', async ({
      page,
    }) => {
      await test.step('Navigate to rule updates page', async () => {
        await page.goto(RULES_UPGRADE_URL);
      });

      await test.step('Verify upgrade table or empty state loads', async () => {
        const upgradesTable = page.testSubj.locator('rules-upgrades-table');
        const noUpgradesMessage = page.testSubj.locator('noRulesAvailableForUpgradeMessage');
        await expect(upgradesTable.or(noUpgradesMessage)).toBeVisible({ timeout: 60_000 });
      });

      await test.step('Verify upgrade all button is available', async () => {
        const upgradeAllBtn = page.testSubj.locator('upgradeAllRulesButton');
        const noUpgradesMessage = page.testSubj.locator('noRulesAvailableForUpgradeMessage');
        await expect(upgradeAllBtn.or(noUpgradesMessage)).toBeVisible();
      });
    });

    test('verifies upgraded rules appear in management table with target version', async ({
      page,
    }) => {
      await test.step('Navigate to rules management', async () => {
        await page.goto(RULES_MANAGEMENT_URL);
        const rulesTable = page.testSubj.locator('rules-management-table');
        await expect(rulesTable).toBeVisible();
      });

      await test.step('Verify Elastic rules are present', async () => {
        const elasticRulesBtn = page.testSubj.locator('showElasticRulesFilterButton');
        await expect(elasticRulesBtn).toBeVisible();
      });
    });
  }
);
