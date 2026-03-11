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
  'Attacks navigation',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsT1Analyst();
    });

    spaceTest.afterEach(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset(ENABLE_ALERTS_AND_ATTACKS_ALIGNMENT_SETTING);
    });

    spaceTest(
      'updates side nav based on attacks alignment advanced setting',
      async ({ pageObjects, scoutSpace }) => {
        const { detectionsAttackDiscoveryPage } = pageObjects;

        await spaceTest.step(
          'shows standalone Alerts in side nav when advanced setting is OFF',
          async () => {
            await scoutSpace.uiSettings.set({
              [ENABLE_ALERTS_AND_ATTACKS_ALIGNMENT_SETTING]: false,
            });

            await detectionsAttackDiscoveryPage.navigate();
            await pageObjects.collapsibleNav.expandNav();

            await expect(detectionsAttackDiscoveryPage.standaloneAlertsNavItem).toContainText(
              'Alerts'
            );
            await expect(detectionsAttackDiscoveryPage.detectionsNavItem).toBeHidden();
          }
        );

        await spaceTest.step(
          'shows Detections with Alerts and Attacks submenus when advanced setting is ON',
          async () => {
            await scoutSpace.uiSettings.set({
              [ENABLE_ALERTS_AND_ATTACKS_ALIGNMENT_SETTING]: true,
            });

            await detectionsAttackDiscoveryPage.navigate();
            await pageObjects.collapsibleNav.expandNav();

            await expect(detectionsAttackDiscoveryPage.detectionsPanelAlertsNavItem).toBeHidden();
            await expect(detectionsAttackDiscoveryPage.detectionsPanelAttacksNavItem).toBeHidden();

            await expect(detectionsAttackDiscoveryPage.detectionsNavItem).toContainText(
              'Detections'
            );

            await detectionsAttackDiscoveryPage.expandDetectionsSection();

            await expect(detectionsAttackDiscoveryPage.detectionsPanelAlertsNavItem).toContainText(
              'Alerts'
            );
            await expect(detectionsAttackDiscoveryPage.detectionsPanelAttacksNavItem).toContainText(
              'Attacks'
            );
          }
        );
      }
    );
  }
);
