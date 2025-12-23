/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-search';
import { test } from '../fixtures';

test.describe('Homepage - Viewer', { tag: ['@svlSearch'] }, () => {
  test.beforeEach(async ({ page, browserAuth, pageObjects }) => {
    await browserAuth.loginAsViewer();
    await page.addInitScript(() => {
      window.localStorage.setItem('gettingStartedVisited', 'true');
    });
    await pageObjects.homepage.goto();
  });

  test('should not be able to see manage button', async ({ pageObjects }) => {
    const headerLeftGroup = await pageObjects.homepage.getHeaderLeftGroup();

    await expect(headerLeftGroup).toContainText('Welcome, test viewer');
    await expect(headerLeftGroup).not.toContainText('Manage');
  });

  test('Navigation cards should navigate to correct places', async ({ pageObjects, page }) => {
    const navigationCards = await pageObjects.homepage.getNavigationCards();
    await expect(navigationCards).toHaveCount(5);

    const navCardTests = [
      {
        cardTestId: 'searchHomepageNavLinks-discover',
        expectedUrl: 'discover',
      },
      {
        cardTestId: 'searchHomepageNavLinks-dashboards',
        expectedUrl: 'dashboards',
      },
      {
        cardTestId: 'searchHomepageNavLinks-agentBuilder',
        expectedUrl: 'agent_builder',
      },
      {
        cardTestId: 'searchHomepageNavLinks-machineLearning',
        expectedUrl: 'ml/overview',
      },
      {
        cardTestId: 'searchHomepageNavLinks-dataManagement',
        expectedUrl: 'index_management',
      },
    ];

    for (const { cardTestId, expectedUrl } of navCardTests) {
      await pageObjects.homepage.clickNavigationCard(cardTestId);
      await expect(page).toHaveURL(new RegExp(expectedUrl));
      await pageObjects.homepage.goto();
    }
  });

  test('Get started banner should move user back to getting started', async ({
    pageObjects,
    page,
  }) => {
    await pageObjects.homepage.clickGettingStartedButton();

    await expect(page).toHaveURL(new RegExp('getting_started'));
  });
});
