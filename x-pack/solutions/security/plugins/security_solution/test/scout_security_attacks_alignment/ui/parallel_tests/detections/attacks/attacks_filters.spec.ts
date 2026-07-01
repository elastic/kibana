/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest, tags } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';

const ENABLE_ALERTS_AND_ATTACKS_ALIGNMENT_SETTING =
  'securitySolution:enableAlertsAndAttacksAlignment';

spaceTest.describe(
  'Attacks page filters',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    spaceTest.beforeAll(async ({ apiServices }) => {
      await apiServices.attackDiscovery.seedAttackData();
    });

    spaceTest.beforeEach(async ({ browserAuth, scoutSpace }) => {
      await scoutSpace.uiSettings.set({
        [ENABLE_ALERTS_AND_ATTACKS_ALIGNMENT_SETTING]: true,
      });
      await browserAuth.loginAsPlatformEngineer();
    });

    spaceTest.afterEach(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset(ENABLE_ALERTS_AND_ATTACKS_ALIGNMENT_SETTING);
    });

    spaceTest('renders and opens attacks filtering controls', async ({ pageObjects, page }) => {
      const { detectionsAttackDiscoveryPage } = pageObjects;

      await detectionsAttackDiscoveryPage.navigateToAttacksPage();

      await expect(detectionsAttackDiscoveryPage.attacksPageSearchBar).toBeVisible();
      await expect(detectionsAttackDiscoveryPage.attacksPageStandardFilters).toBeVisible();
      await expect(detectionsAttackDiscoveryPage.assigneesFilterButton).toBeVisible();
      await expect(detectionsAttackDiscoveryPage.connectorFilterButton).toBeVisible();
      await expect(detectionsAttackDiscoveryPage.typeFilterButton).toBeVisible();

      await detectionsAttackDiscoveryPage.assigneesFilterButton.click();
      await expect(detectionsAttackDiscoveryPage.assigneesFilterSelectable).toBeVisible();
      await page.keyboard.press('Escape');

      await detectionsAttackDiscoveryPage.connectorFilterButton.click();
      await expect(detectionsAttackDiscoveryPage.connectorFilterSelectable).toBeVisible();
      await page.keyboard.press('Escape');

      await detectionsAttackDiscoveryPage.typeFilterButton.click();
      await expect(detectionsAttackDiscoveryPage.typeFilterSelectable).toBeVisible();
    });

    spaceTest('filters attacks by type and persists selection', async ({ pageObjects, page }) => {
      const { detectionsAttackDiscoveryPage } = pageObjects;

      await spaceTest.step('navigate to attacks page and verify initial state', async () => {
        await detectionsAttackDiscoveryPage.navigateToAttacksPage();
        await expect(detectionsAttackDiscoveryPage.typeFilterButton).toBeVisible();

        // Verify initial state: 2 seeded attacks are visible (1 scheduled, 1 manual)
        await expect(detectionsAttackDiscoveryPage.tableExpandAttackDetailsButtons).toHaveCount(2);
      });

      await spaceTest.step('filter by "Manually generated" and verify table updates', async () => {
        await detectionsAttackDiscoveryPage.typeFilterButton.click();
        await expect(detectionsAttackDiscoveryPage.typeFilterSelectable).toBeVisible();

        await detectionsAttackDiscoveryPage.typeFilterOptionManuallyGenerated.click();
        await page.keyboard.press('Escape');

        // Confirm the table is filtered to 1 manual attack
        await expect(detectionsAttackDiscoveryPage.tableExpandAttackDetailsButtons).toHaveCount(1);
        await expect(detectionsAttackDiscoveryPage.manualAttackSubtitle).toBeVisible();
      });

      await spaceTest.step('filter by "Scheduled" and verify table updates', async () => {
        await detectionsAttackDiscoveryPage.typeFilterButton.click();
        await detectionsAttackDiscoveryPage.typeFilterOptionManuallyGenerated.click(); // unselect
        await detectionsAttackDiscoveryPage.typeFilterOptionScheduled.click(); // select
        await page.keyboard.press('Escape');

        // Confirm the filter is active (badge shows 1)
        await expect(detectionsAttackDiscoveryPage.typeFilterButton).toHaveText(/1/);

        // Confirm the table updates to show the 1 scheduled attack
        await expect(detectionsAttackDiscoveryPage.tableExpandAttackDetailsButtons).toHaveCount(1);
        await expect(detectionsAttackDiscoveryPage.manualAttackSubtitle).toBeHidden();
      });

      await spaceTest.step('reload page and verify filter persistence', async () => {
        await page.reload();

        // Confirm the selection is still active after reload
        await expect(detectionsAttackDiscoveryPage.typeFilterButton).toHaveText(/1/);

        // Confirm the table still shows the 1 scheduled attack
        await expect(detectionsAttackDiscoveryPage.tableExpandAttackDetailsButtons).toHaveCount(1);
        await expect(detectionsAttackDiscoveryPage.manualAttackSubtitle).toBeHidden();

        await detectionsAttackDiscoveryPage.typeFilterButton.click();
        await expect(
          detectionsAttackDiscoveryPage.getActiveTypeFilterOption('Scheduled')
        ).toBeVisible();
      });
    });
  }
);
