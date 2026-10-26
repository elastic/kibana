/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest, tags } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';

spaceTest.describe(
  'serverless security navigation',
  { tag: [...tags.serverless.security.complete] },
  () => {
    spaceTest(
      'security serverless navigation, Launchpad panel, and active nav highlight',
      async ({ page, pageObjects, browserAuth }) => {
        const { serverlessProjectChromePage, collapsibleNav, chrome } = pageObjects;

        await browserAuth.loginAsPrivilegedUser();
        await serverlessProjectChromePage.navigateToSecuritySolutionHomeForChromeNav();

        await spaceTest.step('has security serverless side nav', async () => {
          await expect(serverlessProjectChromePage.primaryNav).toBeVisible();
        });

        await spaceTest.step('updates the page title and navigates back home', async () => {
          // Alerts is nested inside the "Detections" panel opener; open it before clicking Alerts.
          await collapsibleNav.getNavItemById('securityGroup:alertDetections').click();
          await collapsibleNav.clickNavItemByDeepLinkId('securitySolutionUI:alerts');
          await page.waitForURL(/\/app\/security\/alerts/);
          await expect(chrome.pageTitle).toHaveText('Alerts');

          const alertsUrl = page.url();
          await chrome.clickLogo();
          await expect(page).not.toHaveURL(alertsUrl);
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
  }
);
