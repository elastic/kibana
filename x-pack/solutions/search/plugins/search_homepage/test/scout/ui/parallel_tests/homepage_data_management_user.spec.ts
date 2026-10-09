/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-search';
import { expect } from '@kbn/scout-search/ui';
import { spaceTest } from '../fixtures';
import { createDataManagementUserRole } from '../fixtures/custom_roles';

spaceTest.describe(
  'Homepage - Limited permissions user',
  { tag: [...tags.stateful.classic] },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await scoutSpace.setSolutionView('es');
    });

    spaceTest.beforeEach(async ({ page, browserAuth, pageObjects, scoutSpace }) => {
      const role = createDataManagementUserRole(scoutSpace.id);
      await browserAuth.loginWithCustomRole(role);

      await page.addInitScript(() => {
        window.sessionStorage.setItem('gettingStartedVisited', 'true');
      });
      await pageObjects.homepage.goto();
    });

    spaceTest(
      'should only see Data Management panel and Storage/Indices badges',
      async ({ pageObjects, page }) => {
        const navigationCards = await pageObjects.homepage.getNavigationCards();
        await expect(navigationCards).toHaveCount(1);

        const dataManagementCard = page.testSubj.locator('searchHomepageNavLinks-dataManagement');
        await expect(dataManagementCard).toBeVisible();

        const badges = await pageObjects.homepage.getMetricBadges();
        await expect(badges).toHaveCount(2);

        const indicesBadge = await pageObjects.homepage.getMetricBadge('indices');
        await expect(indicesBadge).toBeVisible();

        const storageBadge = await pageObjects.homepage.getMetricBadge('storage');
        await expect(storageBadge).toBeVisible();
      }
    );

    spaceTest('should only see expected primary sidenav items', async ({ pageObjects }) => {
      const { chrome } = pageObjects;
      const isChromeNext = await chrome.isNextChrome();

      await expect(chrome.primaryNavigationItems).toHaveCount(Number(isChromeNext) + 1);
      await expect(chrome.navItemInPrimaryById('data_management')).toBeVisible();
      await expect(chrome.navItemInPrimaryById('searchHomepage')).toBeVisible({
        visible: isChromeNext,
      });
    });
  }
);
