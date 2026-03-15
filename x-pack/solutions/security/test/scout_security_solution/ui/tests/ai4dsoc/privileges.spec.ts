/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../fixtures';
import { CUSTOM_ROLES_URL } from '../../common/urls';

test.describe(
  'AI4dSoC Custom role creation - Security privileges',
  { tag: [...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.ai4dsoc.goto(CUSTOM_ROLES_URL);
    });

    test('should only show Security SOC Management sub-privilege', async ({
      pageObjects,
      page,
    }) => {
      await pageObjects.ai4dsoc.assignToSpaceButton.first().click();
      await pageObjects.ai4dsoc.spaceSelectorComboBox.first().click();
      await page
        .getByRole('option', { name: /All Spaces/i })
        .first()
        .click();
      await pageObjects.ai4dsoc.securityCategory.first().click();
      await expect(page.locator('button.euiAccordion__arrow').first()).toBeVisible();
      await expect(pageObjects.ai4dsoc.socManagementSubFeature.first()).toBeVisible();
      const rows = pageObjects.ai4dsoc.securitySubFeatureTable.locator('> div');
      await expect(rows).toHaveCount(2);
    });

    test('should not show Timelines and Notes features', async ({ pageObjects, page }) => {
      await pageObjects.ai4dsoc.assignToSpaceButton.first().click();
      await pageObjects.ai4dsoc.spaceSelectorComboBox.first().click();
      await page
        .getByRole('option', { name: /All Spaces/i })
        .first()
        .click();
      await expect(pageObjects.ai4dsoc.timelineFeatureLocator().first()).not.toBeAttached();
      await expect(pageObjects.ai4dsoc.notesFeatureLocator().first()).not.toBeAttached();
    });

    test('should not show Siem Migration feature', async ({ pageObjects, page }) => {
      await pageObjects.ai4dsoc.assignToSpaceButton.first().click();
      await pageObjects.ai4dsoc.spaceSelectorComboBox.first().click();
      await page
        .getByRole('option', { name: /All Spaces/i })
        .first()
        .click();
      await expect(pageObjects.ai4dsoc.siemMigrationsFeatureLocator().first()).not.toBeAttached();
    });

    test('should show Cases, Machine Learning, Elastic AI Assistant and Attack discovery features', async ({
      pageObjects,
      page,
    }) => {
      await pageObjects.ai4dsoc.assignToSpaceButton.first().click();
      await pageObjects.ai4dsoc.spaceSelectorComboBox.first().click();
      await page
        .getByRole('option', { name: /All Spaces/i })
        .first()
        .click();
      await expect(pageObjects.ai4dsoc.casesFeature.first()).toBeVisible();
      await expect(pageObjects.ai4dsoc.machineLearningFeature.first()).toBeVisible();
      await expect(pageObjects.ai4dsoc.elasticAiAssistantFeature.first()).toBeVisible();
      await expect(pageObjects.ai4dsoc.attackDiscoveryFeature.first()).toBeVisible();
    });
  }
);
