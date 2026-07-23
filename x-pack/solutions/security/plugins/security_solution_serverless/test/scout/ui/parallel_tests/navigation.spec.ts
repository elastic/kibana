/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest, tags } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';
import { ENABLE_ALERTS_AND_ATTACKS_ALIGNMENT_SETTING } from '@kbn/security-solution-navigation';

spaceTest.describe(
  'serverless security navigation',
  { tag: [...tags.serverless.security.complete] },
  () => {
    // Reset the per-space setting toggled by the "alignment disabled" test below so it
    // never leaks into other tests sharing this worker's space.
    spaceTest.afterEach(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset(ENABLE_ALERTS_AND_ATTACKS_ALIGNMENT_SETTING);
    });

    spaceTest(
      'security serverless side nav, breadcrumbs, Launchpad panel, and active nav highlight',
      async ({ page, pageObjects, browserAuth }) => {
        const { serverlessProjectChromePage, collapsibleNav } = pageObjects;

        await browserAuth.loginAsPrivilegedUser();
        await serverlessProjectChromePage.navigateToSecuritySolutionHomeForChromeNav();

        await spaceTest.step('has security serverless side nav', async () => {
          await expect(serverlessProjectChromePage.primaryNav).toBeVisible();
        });

        await spaceTest.step('breadcrumbs reflect navigation state', async () => {
          await expect(serverlessProjectChromePage.breadcrumbs).toBeVisible();

          // Alerts is nested inside the "Detections" panel opener; open it before clicking Alerts.
          await collapsibleNav.getNavItemById('securityGroup:alertDetections').click();
          await collapsibleNav.clickNavItemByDeepLinkId('securitySolutionUI:alerts');
          await expect(serverlessProjectChromePage.getBreadcrumbByText('Alerts')).toBeVisible();

          const alertsUrl = page.url();
          await serverlessProjectChromePage.clickLogo();
          await expect(page).not.toHaveURL(alertsUrl);
          await expect(serverlessProjectChromePage.getBreadcrumbByText('Alerts')).toBeHidden();
        });

        await spaceTest.step(
          'opens the Launchpad footer panel and navigates to its items',
          async () => {
            await collapsibleNav.getNavItemById('securityGroup:launchpad').click();
            await expect(collapsibleNav.getNavItemById('get_started')).toBeVisible();

            await collapsibleNav.getNavItemById('get_started').click();
            await expect(serverlessProjectChromePage.primaryNav).toBeVisible();
          }
        );

        await spaceTest.step(
          'highlights the active top-level nav item after navigating',
          async () => {
            await collapsibleNav.clickNavItemByDeepLinkId('discover');
            await expect(
              serverlessProjectChromePage.activeNavItemInBodyByDeepLinkId('discover')
            ).toBeVisible();
          }
        );
      }
    );

    spaceTest(
      'shows a flat Alerts link when alerts-and-attacks alignment is disabled',
      async ({ page, pageObjects, browserAuth, scoutSpace }) => {
        const { collapsibleNav } = pageObjects;
        await scoutSpace.uiSettings.set({ [ENABLE_ALERTS_AND_ATTACKS_ALIGNMENT_SETTING]: false });
        await browserAuth.loginAsPrivilegedUser();
        await pageObjects.serverlessProjectChromePage.navigateToSecuritySolutionHomeForChromeNav();

        await expect(collapsibleNav.getNavItemById('securityGroup:alertDetections')).toBeHidden();
        await collapsibleNav.clickNavItemByDeepLinkId('securitySolutionUI:alerts');
        await page.waitForURL(/\/app\/security\/alerts/);
      }
    );
  }
);
