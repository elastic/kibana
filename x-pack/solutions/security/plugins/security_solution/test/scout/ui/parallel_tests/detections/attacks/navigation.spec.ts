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
const ALERTS_NAV_ITEM_SELECTOR = 'solutionSideNavItemLink-alerts';
const DETECTIONS_NAV_ITEM_SELECTOR = 'solutionSideNavItemLink-alert_detections';
const DETECTIONS_NAV_ITEM_BUTTON_SELECTOR = 'solutionSideNavItemButton-alert_detections';
const ATTACKS_NAV_PANEL_ITEM_SELECTOR = 'solutionSideNavPanelLink-attacks';
const ALERTS_NAV_PANEL_ITEM_SELECTOR = 'solutionSideNavPanelLink-alerts';

spaceTest.describe(
  'Attacks navigation',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    spaceTest.afterEach(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset(ENABLE_ALERTS_AND_ATTACKS_ALIGNMENT_SETTING);
    });

    spaceTest(
      'shows standalone Alerts in side nav when advanced setting is OFF',
      async ({ pageObjects, page, scoutSpace }) => {
        await scoutSpace.uiSettings.set({
          [ENABLE_ALERTS_AND_ATTACKS_ALIGNMENT_SETTING]: false,
        });

        await page.gotoApp('securitySolutionUI');
        await pageObjects.collapsibleNav.expandNav();

        const alertsNavItem = page.testSubj.locator(ALERTS_NAV_ITEM_SELECTOR);
        await expect(alertsNavItem).toBeVisible();
        await expect(alertsNavItem).toContainText('Alerts');

        const detectionsNavItem = page.testSubj.locator(DETECTIONS_NAV_ITEM_SELECTOR);
        await expect(detectionsNavItem).toBeHidden();
      }
    );

    spaceTest(
      'shows Detections with Alerts and Attacks submenus when advanced setting is ON',
      async ({ pageObjects, page, scoutSpace }) => {
        await scoutSpace.uiSettings.set({
          [ENABLE_ALERTS_AND_ATTACKS_ALIGNMENT_SETTING]: true,
        });

        await page.gotoApp('securitySolutionUI');
        await pageObjects.collapsibleNav.expandNav();

        const alertsNavItem = page.testSubj.locator(ALERTS_NAV_PANEL_ITEM_SELECTOR);
        await expect(alertsNavItem).toBeHidden();

        const attacksNavItem = page.testSubj.locator(ATTACKS_NAV_PANEL_ITEM_SELECTOR);
        await expect(attacksNavItem).toBeHidden();

        const detectionsNavItem = page.testSubj.locator(DETECTIONS_NAV_ITEM_SELECTOR);
        await expect(detectionsNavItem).toBeVisible();
        await expect(detectionsNavItem).toContainText('Detections');

        await page.testSubj.click(DETECTIONS_NAV_ITEM_BUTTON_SELECTOR);

        await expect(alertsNavItem).toBeVisible();
        await expect(alertsNavItem).toContainText('Alerts');

        await expect(attacksNavItem).toBeVisible();
        await expect(attacksNavItem).toContainText('Attacks');
      }
    );
  }
);
