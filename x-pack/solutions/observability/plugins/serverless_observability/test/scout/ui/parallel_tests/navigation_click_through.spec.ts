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
  'Serverless Observability Navigation Click-through',
  { tag: [...tags.serverless.observability.all] },
  () => {
    test('clicking visible nav items navigates to the correct apps', async ({
      browserAuth,
      pageObjects,
    }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.serverlessNav.goto();

      await test.step('navigate to Discover', async () => {
        await pageObjects.collapsibleNav.clickNavItemByDeepLinkId('discover');
        await expect(
          pageObjects.serverlessNav.pageOrNoData('unifiedTabs_selectedTabContent')
        ).toBeVisible();
      });

      await test.step('navigate to Dashboards', async () => {
        await pageObjects.collapsibleNav.clickNavItemByDeepLinkId('dashboards');
        await expect(pageObjects.serverlessNav.pageOrNoData('dashboardLandingPage')).toBeVisible();
      });

      await test.step('navigate to Alerts', async () => {
        await pageObjects.collapsibleNav.clickNavItemByDeepLinkId('observability-overview:alerts');
        await expect(pageObjects.serverlessNav.getPageLocator('alertsPageWithData')).toBeVisible();
      });

      await test.step('navigate to Add data', async () => {
        await pageObjects.collapsibleNav.clickNavItemByDeepLinkId('observabilityOnboarding');
        await expect(
          pageObjects.serverlessNav.getPageLocator('obltOnboardingHomeTitle')
        ).toBeVisible();
      });

      await test.step('navigate to Developer tools', async () => {
        await pageObjects.collapsibleNav.clickNavItemByDeepLinkId('dev_tools');
        await expect(pageObjects.serverlessNav.getPageLocator('console')).toBeVisible();
      });
    });

    test('clicking More menu nav items navigates to the correct apps', async ({
      browserAuth,
      pageObjects,
      page,
    }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.serverlessNav.goto();

      await test.step('navigate to SLOs via More menu', async () => {
        await pageObjects.collapsibleNav.openMoreMenu();
        await pageObjects.collapsibleNav.clickNavItemByDeepLinkId('slo');
        await expect(
          page
            .getByTestId('slosPage')
            .or(page.getByTestId('o11ySloListWelcomePromptCreateSloButton'))
        ).toBeVisible();
      });
    });
  }
);
