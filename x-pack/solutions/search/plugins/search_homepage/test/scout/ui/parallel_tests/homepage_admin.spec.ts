/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-search';
import { test } from '../fixtures';

test.describe('Homepage - Admin', { tag: ['@svlSearch'] }, () => {
  test.beforeEach(async ({ page, browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await page.addInitScript(() => {
      window.localStorage.setItem('gettingStartedVisited', 'true');
    });
    await pageObjects.homepage.goto();
  });

  test('should see the manage button', async ({ pageObjects }) => {
    const headerLeftGroup = await pageObjects.homepage.getHeaderLeftGroup();

    await expect(headerLeftGroup).toContainText('Welcome, test admin');
    const manageLink = await pageObjects.homepage.getManageLink();
    await expect(manageLink).toBeEnabled();
  });

  test('Should open connection details flyout', async ({ pageObjects }) => {
    await pageObjects.homepage.clickConnectionDetailsButton();

    const flyout = await pageObjects.homepage.getConnectionDetailsFlyout();
    await expect(flyout).toBeVisible();

    const flyoutTitle = await pageObjects.homepage.getConnectionDetailsFlyoutTitle();
    await expect(flyoutTitle).toBeVisible();
  });

  test('Should create API key through the modal', async ({ pageObjects }) => {
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
