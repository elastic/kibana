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
  'Attacks schedule flyout',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    spaceTest.beforeAll(async ({ apiServices, scoutSpace }) => {
      await scoutSpace.savedObjects.cleanStandardList();
      await apiServices.attackDiscovery.seedAttackData();
      await apiServices.attackDiscovery.seedAttackSchedule();
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

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest('opens the schedule flyout from attacks page', async ({ pageObjects }) => {
      const { detectionsAttackDiscoveryPage } = pageObjects;

      await detectionsAttackDiscoveryPage.navigateToAttacksPage();
      await expect(detectionsAttackDiscoveryPage.scheduleButton).toBeVisible();

      await detectionsAttackDiscoveryPage.openScheduleFlyout();

      await expect(detectionsAttackDiscoveryPage.settingsFlyout).toBeVisible();
      await expect(detectionsAttackDiscoveryPage.schedulesTable).toBeVisible();
    });

    spaceTest(
      'opens the schedule details flyout from the attack table row',
      async ({ pageObjects }) => {
        const { detectionsAttackDiscoveryPage } = pageObjects;

        await detectionsAttackDiscoveryPage.navigateToAttacksPage();
        await detectionsAttackDiscoveryPage.collapseKpisSection();

        await expect(detectionsAttackDiscoveryPage.attacksTableSection).toBeVisible();
        await expect(detectionsAttackDiscoveryPage.tableScheduleButtons).toHaveCount(1);

        await detectionsAttackDiscoveryPage.openFirstScheduleDetailsFromTable();
        await expect(detectionsAttackDiscoveryPage.scheduleDetailsFlyout).toBeVisible();
      }
    );
  }
);
