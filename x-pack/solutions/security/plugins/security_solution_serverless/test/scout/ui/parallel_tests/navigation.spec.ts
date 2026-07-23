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

    spaceTest('has security serverless side nav', async ({ pageObjects, browserAuth }) => {
      await browserAuth.loginAsPrivilegedUser();
      await pageObjects.serverlessProjectChromePage.navigateToSecuritySolutionHomeForChromeNav();
      await expect(pageObjects.serverlessProjectChromePage.primaryNav).toBeVisible();
    });

    spaceTest(
      'breadcrumbs reflect navigation state',
      async ({ page, pageObjects, browserAuth }) => {
        const { serverlessProjectChromePage, collapsibleNav } = pageObjects;

        await browserAuth.loginAsPrivilegedUser();
        await serverlessProjectChromePage.navigateToSecuritySolutionHomeForChromeNav();

        // The landing page is the project-chrome "home" node, so its own title isn't
        // repeated as a trailing breadcrumb — only the root "Project" crumb is present.
        await expect(serverlessProjectChromePage.breadcrumbs).toBeVisible();

        // Alerts is nested inside the "Detections" panel opener; open it before clicking Alerts.
        await collapsibleNav.getNavItemById('securityGroup:alertDetections').click();
        await collapsibleNav.clickNavItemByDeepLinkId('securitySolutionUI:alerts');
        await expect(serverlessProjectChromePage.getBreadcrumbByText('Alerts')).toBeVisible();

        const alertsUrl = page.url();
        await serverlessProjectChromePage.clickLogo();
        await expect(page).not.toHaveURL(alertsUrl);
        await expect(serverlessProjectChromePage.getBreadcrumbByText('Alerts')).toBeHidden();
      }
    );

    spaceTest(
      'shows a flat Alerts link when alerts-and-attacks alignment is disabled',
      async ({ page, pageObjects, browserAuth, scoutSpace }) => {
        const { collapsibleNav } = pageObjects;

        // With the setting off, the nav tree renders a top-level Alerts link
        // instead of the "Detections" panel opener used in the test above.
        await scoutSpace.uiSettings.set({ [ENABLE_ALERTS_AND_ATTACKS_ALIGNMENT_SETTING]: false });
        await browserAuth.loginAsPrivilegedUser();
        await pageObjects.serverlessProjectChromePage.navigateToSecuritySolutionHomeForChromeNav();

        await expect(collapsibleNav.getNavItemById('securityGroup:alertDetections')).toBeHidden();
        await collapsibleNav.clickNavItemByDeepLinkId('securitySolutionUI:alerts');
        await page.waitForURL(/\/app\/security\/alerts/);
      }
    );

    spaceTest(
      'opens the Launchpad footer panel and navigates to its items',
      async ({ pageObjects, browserAuth }) => {
        const { serverlessProjectChromePage, collapsibleNav } = pageObjects;

        await browserAuth.loginAsPrivilegedUser();
        await serverlessProjectChromePage.navigateToSecuritySolutionHomeForChromeNav();

        // "Get started" is the only Launchpad child unconditionally available: the AI value
        // report requires an enterprise license and SIEM readiness requires a ui setting, so
        // this test doesn't assert on them to avoid coupling a nav test to licensing/settings.
        //
        // Use node ids, not deep-link ids: "Get started" links to the same deep link as the
        // primary-nav home logo, so `nav-item-deepLinkId-...` matches both and is ambiguous.
        // Node ids are unique.
        await collapsibleNav.getNavItemById('securityGroup:launchpad').click();
        await expect(collapsibleNav.getNavItemById('get_started')).toBeVisible();

        await collapsibleNav.getNavItemById('get_started').click();
        await expect(serverlessProjectChromePage.primaryNav).toBeVisible();
      }
    );

    spaceTest(
      'highlights the active top-level nav item after navigating',
      async ({ pageObjects, browserAuth }) => {
        const { serverlessProjectChromePage, collapsibleNav } = pageObjects;

        await browserAuth.loginAsPrivilegedUser();
        await serverlessProjectChromePage.navigateToSecuritySolutionHomeForChromeNav();

        await collapsibleNav.clickNavItemByDeepLinkId('discover');
        await expect(
          serverlessProjectChromePage.activeNavItemInBodyByDeepLinkId('discover')
        ).toBeVisible();
      }
    );
  }
);
