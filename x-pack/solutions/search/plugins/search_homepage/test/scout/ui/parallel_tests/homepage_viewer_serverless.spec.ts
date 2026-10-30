/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-search';
import { expect } from '@kbn/scout-search/ui';
import { test } from '../fixtures';

test.describe('Homepage - Viewer on serverless', { tag: tags.serverless.search }, () => {
  test.beforeEach(async ({ page, browserAuth, pageObjects }) => {
    await browserAuth.loginAsViewer();
    await page.addInitScript(() => {
      window.localStorage.setItem('gettingStartedVisited', 'true');
    });
    await pageObjects.homepage.goto();
  });

  test('shows the data card without the manage data action', async ({ pageObjects }) => {
    await expect(pageObjects.homepage.dataCard).toBeVisible();
    await expect(pageObjects.homepage.manageDataButton).toBeHidden();
  });
});
