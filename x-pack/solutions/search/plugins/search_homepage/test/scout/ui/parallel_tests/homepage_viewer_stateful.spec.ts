/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-search';
import { expect } from '@kbn/scout-search/ui';
import { test } from '../fixtures';

test.describe('Homepage - Viewer on stateful', { tag: tags.stateful.classic }, () => {
  test.beforeEach(async ({ page, browserAuth, pageObjects }) => {
    await browserAuth.loginAsViewer();
    await page.addInitScript(() => {
      window.localStorage.setItem('gettingStartedVisited', 'true');
    });
    await pageObjects.homepage.goto();
  });

  // the viewer can read indices but not monitor them, so index stats and Index Management are out
  test('shows the data card without total size or the manage data action', async ({
    pageObjects,
  }) => {
    const { homepage } = pageObjects;
    await expect(homepage.dataCard).toBeVisible();
    await expect(homepage.dataCardTotalIndices).toBeVisible();
    await expect(homepage.dataCardDocuments).toBeVisible();
    await expect(homepage.dataCardTotalSize).toBeHidden();
    await expect(homepage.manageDataButton).toBeHidden();
  });

  // unlike the serverless viewer, the stateful viewer holds no API key privileges
  test('shows the dashboards and workflows cards but not the API keys card', async ({
    pageObjects,
  }) => {
    const { homepage } = pageObjects;
    await expect(homepage.dashboardsCard).toBeVisible();
    await expect(homepage.workflowsCard).toBeVisible();
    await expect(homepage.apiKeysCard).toBeHidden();
  });
});
