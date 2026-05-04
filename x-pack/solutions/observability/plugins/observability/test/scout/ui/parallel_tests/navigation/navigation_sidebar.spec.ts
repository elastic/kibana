/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest as test, tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';

test.describe(
  'Stateful Observability Navigation - Sidebar',
  { tag: [...tags.stateful.observability] },
  () => {
    test.beforeAll(async ({ scoutSpace }) => {
      await scoutSpace.setSolutionView('oblt');
    });

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

      await test.step('More panel-opener items are visible', async () => {
        const morePanelIds = ['applications', 'metrics', 'machine_learning-landing', 'otherTools'];
        for (const id of morePanelIds) {
          await expect(nav.navItemInMoreById(id)).toBeVisible();
        }
      });

      await test.step('AI Assistant or Agent Builder entry is present in More', async () => {
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

      await test.step('SLOs (via More menu)', async () => {
        await nav.openMoreMenu();
        await nav.navItemInMoreByDeepLinkId('slo').click();
        await expect(
          page.testSubj
            .locator('slosPage')
            .or(page.testSubj.locator('o11ySloListWelcomePromptCreateSloButton'))
        ).toBeVisible();
      });

      await test.step('Infrastructure opens its nested panel inside the More menu', async () => {
        await nav.openMoreMenu();
        await nav.navItemInMoreById('metrics').click();
        await expect(nav.nestedPanel('metrics')).toBeVisible();
      });

      await test.step('Applications opens its nested panel inside the More menu', async () => {
        await nav.openMoreMenu();
        await nav.navItemInMoreById('applications').click();
        await expect(nav.nestedPanel('applications')).toBeVisible();
      });
    });

    test('in-panel deep links navigate and update breadcrumbs', async ({ pageObjects }) => {
      const nav = pageObjects.observabilityNavigation;

      await test.step('Infrastructure → Inventory', async () => {
        await nav.openMoreMenu();
        await nav.navItemInMoreById('metrics').click();
        await expect(nav.nestedPanel('metrics')).toBeVisible();

        await nav
          .nestedPanel('metrics')
          .locator('[data-test-subj~="nav-item-deepLinkId-metrics:inventory"]')
          .click();
        await expect(nav.breadcrumb({ text: 'Infrastructure inventory' })).toBeVisible();
      });

      await test.step('Infrastructure → Hosts', async () => {
        await nav.openMoreMenu();
        await nav.navItemInMoreById('metrics').click();
        await expect(nav.nestedPanel('metrics')).toBeVisible();

        await nav
          .nestedPanel('metrics')
          .locator('[data-test-subj~="nav-item-deepLinkId-metrics:hosts"]')
          .click();
        await expect(nav.breadcrumb({ text: 'Hosts' })).toBeVisible();
      });

      await test.step('Machine Learning → ML overview', async () => {
        await nav.openMoreMenu();
        await nav.navItemInMoreById('machine_learning-landing').click();
        await expect(nav.nestedPanel('machine_learning-landing')).toBeVisible();

        await nav
          .nestedPanel('machine_learning-landing')
          .locator('[data-test-subj~="nav-item-id-ml:overview"]')
          .click();
      });

      await test.step('Other tools → Anomalies (Logs)', async () => {
        await nav.openMoreMenu();
        await nav.navItemInMoreById('otherTools').click();
        await expect(nav.nestedPanel('otherTools')).toBeVisible();

        await nav
          .nestedPanel('otherTools')
          .locator('[data-test-subj~="nav-item-id-logs:anomalies"]')
          .click();
      });
    });

    test('navigates through the Cases app (list → create → configure)', async ({
      pageObjects,
      page,
    }) => {
      const nav = pageObjects.observabilityNavigation;

      await test.step('Open Cases list', async () => {
        await nav.openMoreMenu();
        await nav.navItemInMoreByDeepLinkId('observability-overview:cases').click();
        await expect(nav.breadcrumb({ text: 'Cases' })).toBeVisible();
      });

      await test.step('Create case', async () => {
        await page.testSubj.click('createNewCaseBtn');
        await expect(nav.breadcrumb({ text: 'Create' })).toBeVisible();
      });

      await test.step('Back to list, then configure', async () => {
        await nav.openMoreMenu();
        await nav.navItemInMoreByDeepLinkId('observability-overview:cases').click();
        await page.testSubj.click('configure-case-button');
        await expect(nav.breadcrumb({ text: 'Settings' })).toBeVisible();
      });
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

      await test.step('Infrastructure → Hosts via More', async () => {
        await nav.openMoreMenu();
        await nav.navItemInMoreById('metrics').click();
        await expect(nav.nestedPanel('metrics')).toBeVisible();

        await nav
          .nestedPanel('metrics')
          .locator('[data-test-subj~="nav-item-deepLinkId-metrics:hosts"]')
          .click();
        await expect(nav.breadcrumb({ text: 'Hosts' })).toBeVisible();
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
