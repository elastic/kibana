/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { mockOnboardingApiKey, spaceTest } from '../fixtures';

spaceTest.describe('Vector DB onboarding paths', { tag: [...tags.serverless.vectordb] }, () => {
  spaceTest.beforeEach(async ({ browserAuth, page }) => {
    await browserAuth.loginAsPrivilegedUser();
    await mockOnboardingApiKey(page);
  });

  spaceTest(
    'sends a first-time user from the app root into the setup guide',
    async ({ page, pageObjects }) => {
      await pageObjects.onboarding.gotoAppRoot();

      await expect(pageObjects.onboarding.generatePathCard).toBeVisible();
      await expect(page).toHaveURL(/\/app\/vectordb\/getting_started$/);
    }
  );

  spaceTest(
    'offers both embedding paths alongside the project connection details',
    async ({ pageObjects }) => {
      await pageObjects.onboarding.gotoPathSelection();

      const { generatePathCard, storePathCard } = pageObjects.onboarding;
      await expect(generatePathCard).toBeVisible();
      await expect(storePathCard).toBeVisible();

      await expect(pageObjects.onboarding.copyEndpointUrlButton).toBeVisible();
      await expect(pageObjects.onboarding.documentationLink).toBeVisible();
      await expect(pageObjects.onboarding.skipSetupButton).toBeVisible();
    }
  );

  spaceTest(
    'walks the generate embeddings path through to the home page',
    async ({ page, pageObjects }) => {
      const { onboarding, vectordbHome } = pageObjects;
      await onboarding.gotoPathSelection();

      await spaceTest.step('the ingest step explains generating embeddings', async () => {
        await onboarding.choosePath('generate-vectors');

        await expect(onboarding.stepTitle('generate-vectors', 'ingest')).toBeVisible();
        await expect(onboarding.snippet).toContainText('my_semantic_vectors');
        await expect(onboarding.snippet).toContainText('semantic_text');
        await expect(onboarding.pill('jinaModels')).toBeVisible();
        await expect(onboarding.pill('semanticTextField')).toBeVisible();
      });

      await spaceTest.step('the search step offers semantic and hybrid examples', async () => {
        await onboarding.continueButton.click();

        await expect(onboarding.stepTitle('generate-vectors', 'search')).toBeVisible();
        await expect(onboarding.snippetTab('semantic')).toBeVisible();
        await expect(onboarding.snippet).toContainText('"semantic_content"');

        await onboarding.selectSnippetTab('hybrid');
        await expect(onboarding.snippet).toContainText('retriever');
      });

      await spaceTest.step('completing the setup lands on the home page', async () => {
        await onboarding.completeSetupButton.click();

        await expect(vectordbHome.header).toBeVisible();
        await expect(page).toHaveURL(/\/app\/vectordb\/?$/);
      });
    }
  );

  spaceTest(
    'walks the bring your own embeddings path through to the home page',
    async ({ page, pageObjects }) => {
      const { onboarding, vectordbHome } = pageObjects;
      await onboarding.gotoPathSelection();

      await spaceTest.step('the ingest step explains storing existing vectors', async () => {
        await onboarding.choosePath('have-vectors');

        await expect(onboarding.stepTitle('have-vectors', 'ingest')).toBeVisible();
        await expect(onboarding.snippet).toContainText('my_dense_vectors');
        await expect(onboarding.pill('storageOptimization')).toBeVisible();
      });

      await spaceTest.step('the search step offers kNN and hybrid examples', async () => {
        await onboarding.continueButton.click();

        await expect(onboarding.stepTitle('have-vectors', 'search')).toBeVisible();
        await expect(onboarding.snippetTab('knn')).toBeVisible();
        await expect(onboarding.snippet).toContainText('query_vector');

        await onboarding.selectSnippetTab('hybrid');
        await expect(onboarding.snippet).toContainText('retriever');
      });

      await spaceTest.step('completing the setup lands on the home page', async () => {
        await onboarding.completeSetupButton.click();

        await expect(vectordbHome.header).toBeVisible();
        await expect(page).toHaveURL(/\/app\/vectordb\/?$/);
      });
    }
  );
});
