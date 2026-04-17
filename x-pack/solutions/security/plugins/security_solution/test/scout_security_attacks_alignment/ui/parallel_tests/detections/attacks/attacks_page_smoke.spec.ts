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
  'Attacks page smoke',
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

    spaceTest('renders critical attacks page components', async ({ pageObjects }) => {
      const { detectionsAttackDiscoveryPage } = pageObjects;

      await detectionsAttackDiscoveryPage.navigateToAttacksPage();

      await expect(detectionsAttackDiscoveryPage.attacksPageContent).toBeVisible();
      await expect(detectionsAttackDiscoveryPage.attacksPageSearchBar).toBeVisible();
      await expect(detectionsAttackDiscoveryPage.attacksPageActions).toBeVisible();
      await expect(detectionsAttackDiscoveryPage.assigneesFilterButton).toBeVisible();
      await expect(detectionsAttackDiscoveryPage.connectorFilterButton).toBeVisible();
      await expect(detectionsAttackDiscoveryPage.attacksPageStandardFilters).toBeVisible();

      await expect(detectionsAttackDiscoveryPage.attacksKpisSection).toBeVisible();
      await expect(detectionsAttackDiscoveryPage.attacksSummaryView).toBeVisible();
      await expect(detectionsAttackDiscoveryPage.attacksListPanel).toBeVisible();
      await expect(detectionsAttackDiscoveryPage.attacksVolumePanel).toBeVisible();
      await expect(detectionsAttackDiscoveryPage.attacksTableSection).toBeAttached();
      await detectionsAttackDiscoveryPage.attacksTableSection.scrollIntoViewIfNeeded();
      await expect(detectionsAttackDiscoveryPage.attacksTableSection).toBeVisible();
      await expect(detectionsAttackDiscoveryPage.attacksListTable).toBeVisible();
      await expect(detectionsAttackDiscoveryPage.tableExpandAttackDetailsButtons).toHaveCount(1);
      await expect(detectionsAttackDiscoveryPage.tableExpandAttackDetailsButtons).toBeVisible();
    });
  }
);
