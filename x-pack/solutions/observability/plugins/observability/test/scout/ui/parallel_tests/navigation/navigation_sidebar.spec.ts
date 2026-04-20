/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { spaceTest as test } from '../../fixtures';

// The new chrome navigation is only rendered in stateful when the space uses
// the 'oblt' solution view. We use `spaceTest` to get an isolated space per
// worker and flip it to 'oblt' before any test runs.
test.describe(
  'Stateful Observability Navigation - Sidebar',
  { tag: [...tags.stateful.classic, ...tags.stateful.observability] },
  () => {
    test.beforeAll(async ({ scoutSpace }) => {
      await scoutSpace.setSolutionView('oblt');
    });

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
          await nav.expectNavItemHasHref(item);
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
          await nav.expectNavItemHasHref(item);
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
        const agentBuilder = nav.navItemInMoreByDeepLinkId('agent_builder');
        await expect(aiAssistant.or(agentBuilder)).toBeVisible();
      });
    });

    test('clicking body nav items navigates to the correct apps', async ({ pageObjects, page }) => {
      const nav = pageObjects.observabilityNavigation;

      await test.step('Discover', async () => {
        await nav.expectNavItemNavigatesTo(
          nav.navItemInPrimaryByDeepLinkId('discover'),
          nav.pageOrNoData('dscPage')
        );
      });

      await test.step('Dashboards', async () => {
        await nav.goto();
        await nav.expectNavItemNavigatesTo(
          nav.navItemInPrimaryByDeepLinkId('dashboards'),
          nav.pageOrNoData('dashboardLandingPage')
        );
      });

      await test.step('Workflows', async () => {
        await nav.goto();
        await nav.expectNavItemNavigatesTo(
          nav.navItemInPrimaryByDeepLinkId('workflows'),
          page.testSubj.locator('workflowsPage')
        );
      });

      await test.step('Alerts', async () => {
        await nav.goto();
        await nav.expectNavItemNavigatesTo(
          nav.navItemInPrimaryByDeepLinkId('observability-overview:alerts'),
          page.testSubj.locator('alertsPageWithData')
        );
      });

      await test.step('SLOs (via More menu)', async () => {
        await nav.goto();
        await page.testSubj.click('kbnChromeNav-moreMenuTrigger');
        await expect(nav.morePopover).toBeVisible();
        await nav.expectNavItemNavigatesTo(
          nav.navItemInMoreByDeepLinkId('slo'),
          page.testSubj
            .locator('slosPage')
            .or(page.testSubj.locator('o11ySloListWelcomePromptCreateSloButton'))
        );
      });

      await test.step('Infrastructure opens its nested panel inside the More menu', async () => {
        await nav.goto();
        await page.testSubj.click('kbnChromeNav-moreMenuTrigger');
        await expect(nav.morePopover).toBeVisible();
        await nav.navItemInMoreById('metrics').click();
        await expect(
          nav.morePopover.locator('[data-test-subj="kbnChromeNav-nestedPanel-metrics"]')
        ).toBeVisible();
      });
    });
  }
);
