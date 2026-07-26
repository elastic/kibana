/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';
import { ONBOARDING_SEEN_STORAGE_KEY } from '../fixtures/constants';
import {
  EMPTY_DEPLOYMENT_STATS,
  POPULATED_DEPLOYMENT_STATS,
  mockDeploymentStats,
} from '../fixtures/mocks';

test.describe('Vector DB home page', { tag: [...tags.serverless.vectordb] }, () => {
  test.beforeEach(async ({ browserAuth, page }) => {
    await browserAuth.loginAsAdmin();
    // Skip the first-load onboarding redirect (see routes.tsx / hasSeenOnboarding)
    await page.addInitScript((key) => {
      window.localStorage.setItem(key, 'true');
    }, ONBOARDING_SEEN_STORAGE_KEY);
  });

  test('renders the overview with banner and documentation quick links', async ({
    pageObjects,
  }) => {
    const home = pageObjects.vectordbHome;
    await home.goto();

    await expect(home.banner).toBeVisible();
    await expect(home.viewDocumentationLink).toBeVisible();
    await expect(home.quickLinkPanels).toHaveCount(3);
  });

  test('empty deployment shows the Get started CTA and navigates to tutorials', async ({
    pageObjects,
    page,
  }) => {
    await mockDeploymentStats(page, EMPTY_DEPLOYMENT_STATS);
    const home = pageObjects.vectordbHome;
    await home.goto();

    await expect(home.getStartedButton).toBeVisible();
    await home.getStartedButton.click();

    await expect(pageObjects.vectordbTutorials.topicFilter).toBeVisible();
    await expect(page).toHaveURL(/\/app\/vectordb\/tutorials/);
  });

  test('populated deployment shows the View supported models CTA', async ({
    pageObjects,
    page,
  }) => {
    await mockDeploymentStats(page, POPULATED_DEPLOYMENT_STATS);
    const home = pageObjects.vectordbHome;
    await home.goto();

    await expect(home.viewSupportedModelsButton).toBeVisible();
    await expect(home.getStartedButton).toBeHidden();
  });
});
