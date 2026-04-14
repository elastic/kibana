/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';

test.describe('ProjectAPIKeys', { tag: tags.stateful.classic }, () => {
  test('generates API key and verifies viewer restrictions', async ({
    pageObjects,
    page,
    browserAuth,
  }) => {
    await test.step('login and navigate to settings', async () => {
      await browserAuth.loginAsAdmin();
      await pageObjects.syntheticsApp.navigateToSettings();
    });

    await test.step('generate project API key', async () => {
      await pageObjects.syntheticsApp.navigateToSettingsTab('Project API Keys');
      await page.click('button:has-text("Generate Project API key")');
      await expect(
        page.getByText(
          'This API key will only be shown once. Please keep a copy for your own records.'
        )
      ).toBeVisible();
      await expect(page.locator('strong:has-text("API key")')).toBeVisible();
    });

    await test.step('viewer cannot generate API keys', async () => {
      await browserAuth.loginAsViewer();
      await pageObjects.syntheticsApp.navigateToSettings();
      await pageObjects.syntheticsApp.navigateToSettingsTab('Project API Keys');
      const generateBtn = page.locator('button:has-text("Generate Project API key")');
      await expect(generateBtn).toBeDisabled();
    });
  });
});
