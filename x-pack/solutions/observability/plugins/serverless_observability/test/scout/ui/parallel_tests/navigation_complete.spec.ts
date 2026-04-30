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

    test('renders expected body nav items with working links', async ({ pageObjects }) => {
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

      await test.step('Open More menu', async () => {
        await nav.openMoreMenu();
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

      await test.step('AI-Assistant or Agent Builder entry is present in More', async () => {
        const aiAssistant = nav.navItemInMoreByDeepLinkId('observabilityAIAssistant');
        const agentBuilder = nav.navItemInMoreById('agent_builder');
        await expect(aiAssistant.or(agentBuilder)).toBeVisible();
      });
    });

    test('clicking body nav items sets the active link, updates breadcrumbs, and navigates', async ({
      pageObjects,
      page,
    }) => {
      const nav = pageObjects.observabilityNavigation;

      await test.step('Discover', async () => {
        await nav.navItemInPrimaryByDeepLinkId('discover').click();
        await expect(nav.pageOrNoData('dscPage')).toBeVisible();
        await expect(nav.activeNavItemByDeepLinkId('discover')).toBeVisible();
        await expect(nav.breadcrumb({ deepLinkId: 'discover' })).toBeVisible();
      });

      await test.step('Dashboards', async () => {
        await nav.navItemInPrimaryByDeepLinkId('dashboards').click();
        await expect(nav.pageOrNoData('dashboardLandingPage')).toBeVisible();
        await expect(nav.activeNavItemByDeepLinkId('dashboards')).toBeVisible();
        await expect(nav.breadcrumb({ deepLinkId: 'dashboards' })).toBeVisible();
      });

      await test.step('Workflows', async () => {
        await nav.navItemInPrimaryByDeepLinkId('workflows').click();
        await expect(page.testSubj.locator('workflowsPage')).toBeVisible();
        await expect(nav.activeNavItemByDeepLinkId('workflows')).toBeVisible();
      });

      await test.step('Alerts', async () => {
        await nav.navItemInPrimaryByDeepLinkId('observability-overview:alerts').click();
        await expect(page.testSubj.locator('alertsPageWithData')).toBeVisible();
        await expect(nav.activeNavItemByDeepLinkId('observability-overview:alerts')).toBeVisible();
      });

      await test.step('Cases (via More menu)', async () => {
        await nav.openMoreMenu();
        await nav.navItemInMoreByDeepLinkId('observability-overview:cases').click();
        await expect(nav.breadcrumb({ text: 'Cases' })).toBeVisible();
      });

      await test.step('SLOs (via More menu)', async () => {
        await nav.openMoreMenu();
        await nav.navItemInMoreByDeepLinkId('slo').click();
        await expect(
          page.testSubj
            .locator('slosPage')
            .or(page.testSubj.locator('o11ySloListWelcomePromptCreateSloButton'))
        ).toBeVisible();
      });

      await test.step('Machine Learning opens its nested panel inside the More menu', async () => {
        await nav.openMoreMenu();
        await nav.navItemInMoreById('machine_learning-landing').click();
        await expect(nav.nestedPanel('machine_learning-landing')).toBeVisible();
      });
    });

    test('footer-panel children navigate and update breadcrumbs', async ({ pageObjects }) => {
      const nav = pageObjects.observabilityNavigation;

      await test.step('data_management → Integrations', async () => {
        await nav.navItemInFooterById('data_management').click();
        await expect(nav.sidePanel('data_management')).toBeVisible();

        await nav
          .sidePanel('data_management')
          .locator('[data-test-subj~="nav-item-deepLinkId-integrations"]')
          .click();
        await expect(nav.breadcrumb({ deepLinkId: 'integrations' })).toBeVisible();
      });

      await test.step('data_management → Fleet', async () => {
        await nav.navItemInFooterById('data_management').click();
        await expect(nav.sidePanel('data_management')).toBeVisible();

        await nav
          .sidePanel('data_management')
          .locator('[data-test-subj~="nav-item-deepLinkId-fleet"]')
          .click();
        await expect(nav.breadcrumb({ text: 'Fleet' })).toBeVisible();
      });

      await test.step('admin_and_settings → Tags', async () => {
        await nav.navItemInFooterById('admin_and_settings').click();
        await expect(nav.sidePanel('admin_and_settings')).toBeVisible();

        await nav
          .sidePanel('admin_and_settings')
          .locator('[data-test-subj~="nav-item-id-management:tags"]')
          .click();
        await expect(nav.breadcrumb({ text: 'Tags' })).toBeVisible();
      });

      await test.step('admin_and_settings → Maintenance Windows', async () => {
        await nav.navItemInFooterById('admin_and_settings').click();
        await expect(nav.sidePanel('admin_and_settings')).toBeVisible();

        await nav
          .sidePanel('admin_and_settings')
          .locator('[data-test-subj~="nav-item-id-management:maintenanceWindows"]')
          .click();
        await expect(nav.breadcrumb({ text: 'Maintenance Windows' })).toBeVisible();
      });
    });

    test('Management landing renders cards navigation', async ({ pageObjects, page }) => {
      const nav = pageObjects.observabilityNavigation;
      await page.gotoApp('management');
      await nav.waitForLoad();
      await expect(page.testSubj.locator('cards-navigation-page')).toBeVisible();
    });

    test('navigates between apps without a full page reload (SPA) and restores via logo', async ({
      pageObjects,
    }) => {
      const nav = pageObjects.observabilityNavigation;

      const expectNoReload = await nav.createNoPageReloadCheck();

      await test.step('Discover via sidenav', async () => {
        await nav.navItemInPrimaryByDeepLinkId('discover').click();
        await expect(nav.activeNavItemByDeepLinkId('discover')).toBeVisible();
        await expect(nav.breadcrumb({ deepLinkId: 'discover' })).toBeVisible();
      });

      await test.step('Agents via More', async () => {
        await nav.openMoreMenu();
        await nav.navItemInMoreById('agent_builder').click();
        await expect(nav.breadcrumb({ text: 'Agents' })).toBeVisible();
      });

      await test.step('admin_and_settings → Tags', async () => {
        await nav.navItemInFooterById('admin_and_settings').click();
        await expect(nav.sidePanel('admin_and_settings')).toBeVisible();

        await nav
          .sidePanel('admin_and_settings')
          .locator('[data-test-subj~="nav-item-id-management:tags"]')
          .click();
        await expect(nav.breadcrumb({ text: 'Tags' })).toBeVisible();
      });

      await test.step('Logo returns to observability landing', async () => {
        await nav.clickLogo();
        await nav.waitForLoad();
        await expect(nav.navItemInPrimaryByDeepLinkId('discover')).toBeVisible();
      });

      await test.step('no page reload happened during the flow', async () => {
        expect(await expectNoReload()).toBe(true);
      });
    });
  }
);
