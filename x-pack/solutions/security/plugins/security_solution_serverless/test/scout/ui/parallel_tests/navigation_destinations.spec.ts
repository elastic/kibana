/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest, tags } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';

spaceTest.describe(
  'serverless security navigation destinations',
  { tag: [...tags.serverless.security.complete] },
  () => {
    spaceTest(
      'navigation via search, sidebar cases link, cases app, and legacy management landing page',
      async ({ page, pageObjects, browserAuth, scoutSpace }) => {
        const { serverlessProjectChromePage, collapsibleNav } = pageObjects;

        await browserAuth.loginAsPrivilegedUser();
        await serverlessProjectChromePage.navigateToSecuritySolutionHomeForChromeNav();

        await spaceTest.step('navigate using search', async () => {
          // spaceTest runs each test in its own space, so app URLs (including the
          // one on the search result) are space-prefixed rather than root-relative.
          await serverlessProjectChromePage.openNavSearch();
          await serverlessProjectChromePage.searchNav('security dashboards');
          await serverlessProjectChromePage
            .getNavSearchOptionByUrl(`/s/${scoutSpace.id}/app/security/dashboards`)
            .click();
          await serverlessProjectChromePage.closeNavSearch();

          await page.waitForURL(/app\/security\/dashboards/);
          expect(page.url()).toContain('app/security/dashboards');
        });

        await spaceTest.step('shows cases in sidebar navigation', async () => {
          await expect(serverlessProjectChromePage.primaryNav).toBeVisible();
          await serverlessProjectChromePage.openChromeNavMoreMenuIfPresent();
          await expect(
            serverlessProjectChromePage.navItemInBodyByDeepLinkId('securitySolutionUI:cases')
          ).toBeVisible();
        });

        await spaceTest.step('navigates to cases app', async () => {
          await expect(async () => {
            await serverlessProjectChromePage.openChromeNavMoreMenuIfPresent();
            await serverlessProjectChromePage
              .navItemInBodyByDeepLinkId('securitySolutionUI:cases')
              .click();
            await page.waitForURL(/\/app\/security\/cases/, { timeout: 5_000 });
          }).toPass({ timeout: 30_000 });

          expect(page.url()).toContain('/app/security/cases');

          await serverlessProjectChromePage.openChromeNavMoreMenuIfPresent();
          await expect(
            serverlessProjectChromePage.activeNavItemInBodyByDeepLinkId('securitySolutionUI:cases')
          ).toBeVisible();
        });

        await spaceTest.step('opens panel on legacy management landing page', async () => {
          await page.gotoApp('management');
          await expect(page.testSubj.locator('cards-navigation-page')).toBeVisible();
          await expect(collapsibleNav.getNavItemById('stack_management')).toBeVisible();
        });
      }
    );

    spaceTest('navigates to maintenance windows', async ({ browserAuth, pageObjects }) => {
      const { serverlessProjectChromePage, collapsibleNav } = pageObjects;

      // Admin is the only role that has "maintenanceWindow" feature privilege.
      await browserAuth.loginAsAdmin();
      await serverlessProjectChromePage.navigateToSecuritySolutionHomeForChromeNav();

      await collapsibleNav.clickItem('stack_management');
      await collapsibleNav.clickItem('management:maintenanceWindows', { lowercase: false });
      await expect(
        serverlessProjectChromePage.getBreadcrumbByText('Maintenance Windows')
      ).toBeVisible();
    });
  }
);
