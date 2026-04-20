/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';

test.describe(
  'Serverless Observability Navigation - Complete tier body',
  { tag: [...tags.serverless.observability.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.observabilityNavigation.goto();
      await pageObjects.observabilityNavigation.waitForLoad();
    });

    test('renders expected body nav items with working links', async ({ pageObjects, page }) => {
      const nav = pageObjects.observabilityNavigation;

      await test.step('primary body items are visible and linked', async () => {
        const primaryDeepLinks = [
          'discover',
          'dashboards',
          'workflows',
          'observability-overview:alerts',
        ];
        for (const deepLinkId of primaryDeepLinks) {
          const item = nav.navItemInPrimaryByDeepLinkId(deepLinkId);
          await expect(item).toBeVisible();
          await expect(item).toHaveAttribute('href', /.+/);
        }
      });

      await test.step('opening More menu reveals overflow body items', async () => {
        await page.testSubj.click('kbnChromeNav-moreMenuTrigger');
        await expect(nav.morePopover).toBeVisible();
      });

      await test.step('More linked items are visible and linked', async () => {
        const moreDeepLinks = ['observability-overview:cases', 'slo'];
        for (const deepLinkId of moreDeepLinks) {
          const item = nav.navItemInMoreByDeepLinkId(deepLinkId);
          await expect(item).toBeVisible();
          await expect(item).toHaveAttribute('href', /.+/);
        }
      });

      await test.step('More panel-opener items are visible (complete tier)', async () => {
        const morePanelIds = ['applications', 'metrics', 'machine_learning-landing', 'otherTools'];
        for (const id of morePanelIds) {
          await expect(nav.navItemInMoreById(id)).toBeVisible();
        }
      });
    });

    test('clicking body nav items navigates to the correct apps', async ({ pageObjects, page }) => {
      const nav = pageObjects.observabilityNavigation;

      await test.step('Discover', async () => {
        await nav.navItemInPrimaryByDeepLinkId('discover').click();
        await expect(nav.pageOrNoData('dscPage')).toBeVisible();
      });

      await test.step('Dashboards', async () => {
        await nav.goto();
        await nav.navItemInPrimaryByDeepLinkId('dashboards').click();
        await expect(nav.pageOrNoData('dashboardLandingPage')).toBeVisible();
      });

      await test.step('Workflows', async () => {
        await nav.goto();
        await nav.navItemInPrimaryByDeepLinkId('workflows').click();
        await expect(page.testSubj.locator('workflowsPage')).toBeVisible();
      });

      await test.step('Alerts', async () => {
        await nav.goto();
        await nav.navItemInPrimaryByDeepLinkId('observability-overview:alerts').click();
        await expect(page.testSubj.locator('alertsPageWithData')).toBeVisible();
      });

      await test.step('SLOs (via More menu)', async () => {
        await nav.goto();
        await page.testSubj.click('kbnChromeNav-moreMenuTrigger');
        await expect(nav.morePopover).toBeVisible();
        await nav.navItemInMoreByDeepLinkId('slo').click();
        await expect(
          page.testSubj
            .locator('slosPage')
            .or(page.testSubj.locator('o11ySloListWelcomePromptCreateSloButton'))
        ).toBeVisible();
      });

      await test.step('Machine Learning opens its nested panel inside the More menu', async () => {
        await nav.goto();
        await page.testSubj.click('kbnChromeNav-moreMenuTrigger');
        await expect(nav.morePopover).toBeVisible();
        await nav.navItemInMoreById('machine_learning-landing').click();
        await expect(
          nav.morePopover.locator(
            '[data-test-subj="kbnChromeNav-nestedPanel-machine_learning-landing"]'
          )
        ).toBeVisible();
      });
    });
  }
);
