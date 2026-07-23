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
    spaceTest('navigate using search', async ({ page, pageObjects, browserAuth, scoutSpace }) => {
      const { serverlessProjectChromePage } = pageObjects;

      await browserAuth.loginAsPrivilegedUser();
      await serverlessProjectChromePage.navigateToSecuritySolutionHomeForChromeNav();

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

    spaceTest('shows cases in sidebar navigation', async ({ pageObjects, browserAuth }) => {
      const { serverlessProjectChromePage } = pageObjects;

      await browserAuth.loginAsPrivilegedUser();
      await serverlessProjectChromePage.navigateToSecuritySolutionHomeForChromeNav();

      await expect(serverlessProjectChromePage.primaryNav).toBeVisible();
      await serverlessProjectChromePage.openChromeNavMoreMenuIfPresent();
      await expect(
        serverlessProjectChromePage.navItemInBodyByDeepLinkId('securitySolutionUI:cases')
      ).toBeVisible();
    });

    // Deliberately asserts only the navigation contract (URL + active nav-item highlight),
    // not that a specific Cases page landmark renders. An earlier version of this test
    // asserted the `cases-all-title` test-subj, which is owned by `@kbn/cases-plugin` and
    // broke when the Cases redesign changed that page's internals (kibana#266915). Nav
    // tests shouldn't reach into another plugin's page internals — that coverage belongs
    // in a Cases-owned suite.
    spaceTest('navigates to cases app', async ({ page, pageObjects, browserAuth }) => {
      const { serverlessProjectChromePage } = pageObjects;

      await browserAuth.loginAsPrivilegedUser();
      await serverlessProjectChromePage.navigateToSecuritySolutionHomeForChromeNav();

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

    spaceTest(
      'opens panel on legacy management landing page',
      async ({ page, pageObjects, browserAuth }) => {
        const { serverlessProjectChromePage, collapsibleNav } = pageObjects;

        await browserAuth.loginAsPrivilegedUser();
        await serverlessProjectChromePage.navigateToSecuritySolutionHomeForChromeNav();

        await page.gotoApp('management');
        await expect(page.testSubj.locator('cards-navigation-page')).toBeVisible();
        await expect(collapsibleNav.getNavItemById('stack_management')).toBeVisible();
      }
    );
  }
);
