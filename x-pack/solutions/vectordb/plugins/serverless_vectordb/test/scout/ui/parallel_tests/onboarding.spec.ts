/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

const ONBOARDING_KEY_NAME_PREFIX = 'vectordb-onboarding-';

test.describe('Vector DB onboarding', { tag: [...tags.serverless.vectordb] }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  // Visiting the landing page auto-creates an onboarding API key (useOnboardingCredentials)
  test.afterAll(async ({ esClient }) => {
    const { api_keys: apiKeys } = await esClient.security.getApiKey({
      name: `${ONBOARDING_KEY_NAME_PREFIX}*`,
    });
    const ids = apiKeys.filter((key) => !key.invalidated).map((key) => key.id);
    if (ids.length > 0) {
      await esClient.security.invalidateApiKey({ ids });
    }
  });

  test('redirects a new user to the path selection landing page', async ({ pageObjects, page }) => {
    const onboarding = pageObjects.vectordbOnboarding;
    await onboarding.goto();

    await test.step('lands on the onboarding route with path cards', async () => {
      await expect(onboarding.generatePathCard).toBeVisible();
      await expect(onboarding.storePathCard).toBeVisible();
      await expect(onboarding.skipButton).toBeVisible();
      await expect(onboarding.documentationLink).toBeVisible();
      await expect(page).toHaveURL(/\/app\/vectordb\/onboarding/);
    });

    await test.step('chrome navigation is hidden during first-load onboarding', async () => {
      await expect(pageObjects.vectordbNavigation.sidenav).toBeHidden();
    });
  });

  test('skip goes straight to the home page', async ({ pageObjects, page }) => {
    const onboarding = pageObjects.vectordbOnboarding;
    await onboarding.goto();
    await expect(onboarding.skipButton).toBeVisible();

    await onboarding.skipButton.click();

    await expect(pageObjects.vectordbHome.banner).toBeVisible();
    await expect(page).not.toHaveURL(/\/onboarding/);
  });

  test('walks the ingest and search wizard for the generate-embeddings path', async ({
    pageObjects,
  }) => {
    const onboarding = pageObjects.vectordbOnboarding;
    await onboarding.goto();

    await test.step('choose the generate-embeddings path', async () => {
      await expect(onboarding.generatePathCard).toBeVisible();
      await onboarding.generatePathCard.click();
    });

    await test.step('ingest step shows snippet tooling', async () => {
      await expect(onboarding.snippet).toBeVisible();
      await expect(onboarding.stepsRail).toBeVisible();
      await expect(onboarding.copyCodeButton).toBeVisible();
      await expect(onboarding.runInConsoleButton).toBeVisible();
      await expect(onboarding.backButton).toBeVisible();
      await expect(onboarding.connectionDetailsButton).toBeVisible();
    });

    await test.step('switch snippet language to JavaScript', async () => {
      await onboarding.selectLanguage('javascript');
      await expect(onboarding.languagePicker).toContainText('JavaScript');
    });

    await test.step('continue to the search step', async () => {
      await onboarding.continueToSearchButton.click();
      await expect(onboarding.completeSetupButton).toBeVisible();
      await expect(onboarding.snippet).toBeVisible();
    });

    await test.step('complete setup lands on the home page', async () => {
      await onboarding.completeSetupButton.click();
      await expect(pageObjects.vectordbHome.banner).toBeVisible();
    });
  });
});
