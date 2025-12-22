/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import { test } from '../fixtures';

test.describe('Homepage', { tag: ['@svlSearch'] }, () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('gettingStartedVisited', 'true');
    });
  });

  test('Viewer should not be able to see manage button', async ({ pageObjects, browserAuth }) => {
    await browserAuth.loginAsViewer();
    await pageObjects.homepage.goto();

    const headerLeftGroup = await pageObjects.homepage.getHeaderLeftGroup();

    await expect(headerLeftGroup).toContainText('Welcome, test viewer');
    await expect(headerLeftGroup).not.toContainText('Manage');
  });

  test('Admin should see the manage button', async ({ pageObjects, browserAuth }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.homepage.goto();

    const headerLeftGroup = await pageObjects.homepage.getHeaderLeftGroup();

    await expect(headerLeftGroup).toContainText('Welcome, test admin');
    const manageLink = await pageObjects.homepage.getManageLink();
    await expect(manageLink).toBeEnabled();
  });

  test('Navigation cards should navigate to correct places', async ({
    pageObjects,
    browserAuth,
    page,
  }) => {
    await browserAuth.loginAsViewer();
    await pageObjects.homepage.goto();

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
    browserAuth,
    page,
  }) => {
    await browserAuth.loginAsViewer();
    await pageObjects.homepage.goto();

    await pageObjects.homepage.clickGettingStartedButton();

    await expect(page).toHaveURL(new RegExp('getting_started'));
  });

  test('Should open connection details flyout', async ({ pageObjects, browserAuth }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.homepage.goto();

    await pageObjects.homepage.clickConnectionDetailsButton();

    const flyout = await pageObjects.homepage.getConnectionDetailsFlyout();
    await expect(flyout).toBeVisible();

    const flyoutTitle = await pageObjects.homepage.getConnectionDetailsFlyoutTitle();
    await expect(flyoutTitle).toBeVisible();
  });

  test('Should create API key through the modal', async ({ pageObjects, browserAuth }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.homepage.goto();

    await pageObjects.homepage.clickApiKeysButton();

    const flyout = await pageObjects.homepage.getConnectionDetailsFlyout();
    await expect(flyout).toBeVisible();

    await pageObjects.homepage.fillApiKeyName('Test API Key');
    await pageObjects.homepage.clickCreateApiKeySubmitButton();

    const successForm = await pageObjects.homepage.getApiKeySuccessForm();
    await expect(successForm).toBeVisible();

    const apiKeyValueRow = await pageObjects.homepage.getApiKeyValueRow();
    await expect(apiKeyValueRow).toBeVisible();
  });
});
