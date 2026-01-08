/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-search';
import { test } from '../fixtures';
import { SEARCH_HOMEPAGE_V2_UI_FLAG } from '../../../../common';

test.describe('Search Homepage (V1)', { tag: ['@ess', '@svlSearch'] }, () => {
  // Disable the V2 homepage to test the old (V1) homepage
  test.beforeAll(async ({ kbnClient }) => {
    await kbnClient.uiSettings.update({
      [SEARCH_HOMEPAGE_V2_UI_FLAG]: false,
    });
  });

  test.afterAll(async ({ kbnClient }) => {
    // Reset to default (V2 enabled)
    await kbnClient.uiSettings.unset(SEARCH_HOMEPAGE_V2_UI_FLAG);
  });

  test.beforeEach(async ({ page, browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await page.addInitScript(() => {
      window.localStorage.setItem('gettingStartedVisited', 'true');
    });
    await pageObjects.homepage.goto();
  });

  test('should have embedded dev console', async ({ pageObjects }) => {
    // Verify the console control bar exists
    await pageObjects.homepage.expectEmbeddedConsoleControlBarExists();

    // Verify console is initially closed
    const consoleBodyInitial = await pageObjects.homepage.getEmbeddedConsoleBody();
    await expect(consoleBodyInitial).toBeHidden();

    // Click to open the console
    await pageObjects.homepage.clickEmbeddedConsoleControlBar();

    // Verify fullscreen toggle is present
    const fullscreenToggle = await pageObjects.homepage.getFullscreenToggleButton();
    await expect(fullscreenToggle).toBeVisible();

    // Verify console is now open
    const consoleBodyOpen = await pageObjects.homepage.getEmbeddedConsoleBody();
    await expect(consoleBodyOpen).toBeVisible();

    // Click to close the console
    await pageObjects.homepage.clickEmbeddedConsoleControlBar();

    // Verify console is closed again
    const consoleBodyClosed = await pageObjects.homepage.getEmbeddedConsoleBody();
    await expect(consoleBodyClosed).toBeHidden();
  });

  test('should load search home page', async ({ pageObjects }) => {
    // Verify the search homepage container is loaded
    const homepageContainer = await pageObjects.homepage.getSearchHomepageContainer();
    await expect(homepageContainer).toBeVisible();
  });

  // TODO: Add more tests from FTR as they are migrated
  // - Elasticsearch endpoint and API Keys
  // - Connect To Elasticsearch Side Panel
  // - Get started with API
  // - Alternate Solutions
  // - Dive deeper with Elasticsearch
  // - Footer content
});
