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
      await browserAuth.loginAsAdmin();
    });

    spaceTest.afterEach(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset(ENABLE_ALERTS_AND_ATTACKS_ALIGNMENT_SETTING);
    });

    spaceTest('renders and opens attacks filtering controls', async ({ pageObjects, page }) => {
      const { detectionsAttackDiscoveryPage } = pageObjects;

      await detectionsAttackDiscoveryPage.navigateToAttacksPage();

      await expect(detectionsAttackDiscoveryPage.attacksPageSearchBar).toBeVisible();
      await expect(detectionsAttackDiscoveryPage.attacksPageStandardFilters).toBeVisible();
      await expect(detectionsAttackDiscoveryPage.attacksPageAssigneeFilter).toBeVisible();
      await expect(detectionsAttackDiscoveryPage.attacksPageConnectorFilter).toBeVisible();
      await expect(detectionsAttackDiscoveryPage.assigneesFilterButton).toBeVisible();
      await expect(detectionsAttackDiscoveryPage.connectorFilterButton).toBeVisible();

      await detectionsAttackDiscoveryPage.assigneesFilterButton.click();
      await expect(page.testSubj.locator('securitySolutionAssigneesSelectable')).toBeVisible();
      await page.keyboard.press('Escape');

      await detectionsAttackDiscoveryPage.connectorFilterButton.click();
      await expect(page.testSubj.locator('connectorFilterSelectable')).toBeVisible();
    });
  }
);
