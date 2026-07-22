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
    spaceTest('has security serverless side nav', async ({ pageObjects, browserAuth }) => {
      await browserAuth.loginAsPrivilegedUser();
      await pageObjects.serverlessProjectChromePage.navigateToSecuritySolutionHomeForChromeNav();
      await expect(pageObjects.serverlessProjectChromePage.primaryNav).toBeVisible();
    });

    spaceTest('breadcrumbs reflect navigation state', async ({ pageObjects, browserAuth }) => {
      const { serverlessProjectChromePage, collapsibleNav } = pageObjects;

      await browserAuth.loginAsPrivilegedUser();
      await serverlessProjectChromePage.navigateToSecuritySolutionHomeForChromeNav();

      await expect(serverlessProjectChromePage.breadcrumbs).toBeVisible();
      await expect(serverlessProjectChromePage.getBreadcrumbByText('Get started')).toBeVisible();

      // Alerts is nested inside the "Detections" panel opener; open it before clicking Alerts.
      await collapsibleNav.getNavItemById('securityGroup:alertDetections').click();
      await collapsibleNav.clickNavItemByDeepLinkId('securitySolutionUI:alerts');
      await expect(serverlessProjectChromePage.getBreadcrumbByText('Alerts')).toBeVisible();

      await serverlessProjectChromePage.clickLogo();
      await expect(serverlessProjectChromePage.getBreadcrumbByText('Get started')).toBeVisible();
    });

    spaceTest('navigate using search', async ({ page, pageObjects, browserAuth }) => {
      const { serverlessProjectChromePage } = pageObjects;

      await browserAuth.loginAsPrivilegedUser();
      await serverlessProjectChromePage.navigateToSecuritySolutionHomeForChromeNav();

      await serverlessProjectChromePage.openNavSearch();
      await serverlessProjectChromePage.searchNav('security dashboards');
      await serverlessProjectChromePage.getNavSearchOptionByUrl('/app/security/dashboards').click();
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
