/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt';
import { test } from '../fixtures';

test.describe('Search Highlighting', () => {
  test.beforeEach(async ({ pageObjects, browserAuth }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.onboarding.goto();
    await pageObjects.onboarding.waitForMainTilesToLoad();
  });

  test(
    'highlights search term in integration card titles and descriptions',
    { tag: ['@ess', '@svlOblt'] },
    async ({ page, pageObjects }) => {
      await test.step('select host use case to show integrations', async () => {
        await pageObjects.onboarding.selectHostUseCase();
      });

      await test.step('search for an integration and wait for results', async () => {
        // Search for a common integration term
        await pageObjects.onboarding.searchForIntegration('nginx');
        // Wait for search results to appear - there will be 2 epmList.integrationCards grids:
        // 1. Quickstart cards ("Monitor your Host using:")
        // 2. Search results from PackageListGrid
        // We need at least 2 grids to confirm search results rendered
        const grids = page.getByTestId('epmList.integrationCards');
        await expect(grids).toHaveCount(2, { timeout: 30000 });
      });

      await test.step('verify search term is highlighted in results', async () => {
        // Get the search results grid (the second epmList.integrationCards)
        // It renders outside the "Monitor your Host using:" group
        const searchResultsGrid = page.locator(
          '[data-test-subj="epmList.integrationCards"]:not(:has([data-test-subj="integration-card:auto-detect-logs"]))'
        );
        await expect(searchResultsGrid).toBeVisible();

        // Verify there are integration cards in the search results
        const cards = searchResultsGrid.locator('[data-test-subj^="integration-card:"]');
        const cardCount = await cards.count();
        expect(cardCount).toBeGreaterThan(0);

        // Verify that highlighted text (mark elements) exists in the cards
        // EuiHighlight wraps matched text in <mark> elements with the search term
        const highlights = searchResultsGrid.locator('mark');
        const highlightCount = await highlights.count();
        expect(highlightCount).toBeGreaterThan(0);
      });
    }
  );
});
