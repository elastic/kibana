/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../../fixtures';
import { deleteAlertsAndRules, installPrebuiltRules } from '../../../../common/api_helpers';
import { RULES_MANAGEMENT_URL, RULES_UPGRADE_URL } from '../../../../common/urls';

test.describe(
  'Upgrade prebuilt rules - notifications',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, apiServices, kbnClient }) => {
      await browserAuth.loginAsAdmin();
      await deleteAlertsAndRules(apiServices);
    });

    test('does NOT display upgrade reminder callout when no prebuilt rules are installed', async ({
      page,
    }) => {
      await test.step('Navigate to rules management table', async () => {
        await page.goto(RULES_MANAGEMENT_URL);
      });

      await test.step('Verify no upgrade callout is displayed', async () => {
        const upgradeCallout = page.testSubj.locator('prebuiltRulesUpgradeReminderCallout');
        await expect(upgradeCallout).toBeHidden();
      });

      await test.step('Verify Rule Updates tab is not shown', async () => {
        const updatesTab = page.testSubj.locator('navigation-updates');
        await expect(updatesTab).toBeHidden();
      });
    });

    test('does NOT display upgrade reminder when all installed prebuilt rules are up to date', async ({
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

      await test.step('Verify no upgrade callout is displayed', async () => {
        const upgradeCallout = page.testSubj.locator('prebuiltRulesUpgradeReminderCallout');
        await expect(upgradeCallout).toBeHidden();
      });
    });

    test('shows upgrade reminder callout when there are prebuilt rules to upgrade', async ({
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

    test('opens the Rule Upgrade table from upgrade tab', async ({
      page,
      apiServices,
      kbnClient,
    }) => {
      await test.step('Install prebuilt rules', async () => {
        await installPrebuiltRules(kbnClient);
      });

      await test.step('Navigate to rule updates page', async () => {
        await page.goto(RULES_UPGRADE_URL);
      });

      await test.step('Verify upgrade table or empty message is shown', async () => {
        const upgradesTable = page.testSubj.locator('rules-upgrades-table');
        const noUpgradesMessage = page.testSubj.locator('noRulesAvailableForUpgradeMessage');
        await expect(upgradesTable.or(noUpgradesMessage)).toBeVisible({ timeout: 60_000 });
      });
    });

    test('shows upgrade reminder on rule details page for outdated rule', async ({
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
