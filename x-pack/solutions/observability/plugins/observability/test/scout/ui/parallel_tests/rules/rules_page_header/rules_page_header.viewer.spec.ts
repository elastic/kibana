/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../../../fixtures';

test.describe(
  'Rules Page - Header',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsViewer();
      // Navigate to the rules list page
      await pageObjects.rulesPage.goto();
      // Verify we're on the rules page
      await expect(pageObjects.rulesPage.pageTitle).toBeVisible();
    });

    test('should open settings page, verify buttons state, and cancel successfully', async ({
      pageObjects,
    }) => {
      // Open the settings sub-page
      await pageObjects.rulesPage.openSettingsPage();
      await pageObjects.rulesPage.expectSettingsPageVisible();

      // Verify buttons are visible and in the expected state
      await expect(pageObjects.rulesPage.settingsPageCancelButton).toBeVisible();
      await expect(pageObjects.rulesPage.settingsPageCancelButton).toBeEnabled();
      await expect(pageObjects.rulesPage.settingsPageSaveButton).toBeVisible();
      await expect(pageObjects.rulesPage.settingsPageSaveButton).toBeDisabled();

      // Cancel leaves the settings page
      await pageObjects.rulesPage.cancelSettingsPage();

      // Verify we are back on the rules list
      await expect(pageObjects.rulesPage.settingsPage).toBeHidden();
      await expect(pageObjects.rulesPage.pageTitle).toBeVisible();
    });
  }
);
