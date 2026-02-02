/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-search';
import { test } from '../fixtures';

test.describe('Getting Started - Viewer', { tag: ['@ess', '@svlSearch'] }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsViewer();
    await pageObjects.gettingStarted.goto();
  });

  test('verifies viewer has limited access to API keys functionality', async ({ pageObjects }) => {
    await test.step('should display no API keys access message', async () => {
      const noAccessMessage = await pageObjects.gettingStarted.getNoApiKeysAccessMessage();
      await expect(noAccessMessage).toBeVisible();
    });

    await test.step('connection details flyout should not show API Keys tab', async () => {
      await pageObjects.gettingStarted.clickViewConnectionDetailsLink();

      const modalTitle = await pageObjects.gettingStarted.getConnectionDetailsModalTitle();
      await expect(modalTitle).toBeVisible();

      // Endpoints tab should exist
      const endpointsTab = await pageObjects.gettingStarted.getConnectionDetailsEndpointsTab();
      await expect(endpointsTab).toBeVisible();

      // API Keys tab should NOT exist for viewer
      const apiKeysTab = await pageObjects.gettingStarted.getConnectionDetailsApiKeysTab();
      await expect(apiKeysTab).toBeHidden();
    });
  });
});
