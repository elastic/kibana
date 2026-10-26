/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { mockOnboardingApiKey, spaceTest } from '../fixtures';

spaceTest.describe(
  'Vector DB onboarding navigation',
  { tag: [...tags.serverless.vectordb] },
  () => {
    spaceTest.beforeEach(async ({ browserAuth, page }) => {
      await browserAuth.loginAsPrivilegedUser();
      await mockOnboardingApiKey(page);
    });

    spaceTest('steps back from the search step to the ingest step', async ({ pageObjects }) => {
      const { onboarding } = pageObjects;
      await onboarding.gotoSearchStep('have-vectors');
      await expect(onboarding.stepTitle('have-vectors', 'search')).toBeVisible();

      await onboarding.backButton.click();

      await expect(onboarding.stepTitle('have-vectors', 'ingest')).toBeVisible();
    });

    spaceTest('skipping the setup guide lands on the home page', async ({ pageObjects }) => {
      await pageObjects.onboarding.gotoPathSelection();

      await pageObjects.onboarding.skipSetupButton.click();

      await expect(pageObjects.vectordbHome.header).toBeVisible();
    });

    spaceTest(
      'returns a wizard step opened without a path to path selection',
      async ({ pageObjects }) => {
        await pageObjects.onboarding.gotoIngestStep();

        await expect(pageObjects.onboarding.generatePathCard).toBeVisible();
      }
    );

    spaceTest('carries the chosen snippet language across steps', async ({ pageObjects }) => {
      const { onboarding } = pageObjects;
      await onboarding.gotoIngestStep('generate-vectors');
      await expect(onboarding.languagePicker).toContainText('Python');

      await onboarding.selectLanguage('javascript');
      await expect(onboarding.snippet).toContainText('@elastic/elasticsearch');

      await onboarding.continueButton.click();

      await expect(onboarding.languagePicker).toContainText('JavaScript');
      await expect(onboarding.snippet).toContainText('@elastic/elasticsearch');
    });

    spaceTest('explains a concept when its pill is opened', async ({ pageObjects }) => {
      const { onboarding } = pageObjects;
      await onboarding.gotoSearchStep('generate-vectors');

      const popover = await onboarding.openPill('semanticSearch');

      await expect(popover).toContainText('Results are ranked by meaning');
    });
  }
);
