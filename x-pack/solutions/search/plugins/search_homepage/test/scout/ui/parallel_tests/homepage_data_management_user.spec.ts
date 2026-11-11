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
        window.localStorage.setItem('gettingStartedVisited', 'true');
      });
      await pageObjects.homepage.goto();
    });

    spaceTest('only sees the data card, with its manage data action', async ({ pageObjects }) => {
      const { homepage } = pageObjects;
      await expect(homepage.dataCard).toBeVisible();
      await expect(homepage.manageDataButton).toBeVisible();

      await expect(homepage.dashboardsCard).toBeHidden();
      await expect(homepage.workflowsCard).toBeHidden();
      await expect(homepage.apiKeysCard).toBeHidden();
    });

    spaceTest('cannot chat with the AI agent without Agent Builder', async ({ pageObjects }) => {
      const { homepage } = pageObjects;
      await expect(homepage.viewPromptButton).toBeVisible();
      await expect(homepage.openElasticAgentButton).toBeHidden();
    });

    spaceTest('should only see expected primary sidenav items', async ({ pageObjects }) => {
      const { chrome } = pageObjects;
      const isProjectChrome = await chrome.isProjectChrome();

      await expect(chrome.primaryNavigationItems).toHaveCount(Number(isProjectChrome) + 1);
      await expect(chrome.navItemInPrimaryById('data_management')).toBeVisible();
      await expect(chrome.navItemInPrimaryById('searchHomepage')).toBeVisible({
        visible: isProjectChrome,
      });
    });
  }
);
