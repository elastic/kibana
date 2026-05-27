/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-search';
import { expect } from '@kbn/scout-search/ui';
import { test } from '../fixtures';

test.describe(
  'Getting Started - Viewer',
  { tag: [...tags.stateful.classic, ...tags.serverless.search] },
  () => {
    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsViewer();
      await pageObjects.gettingStarted.goto();
    });

    test('should display kibana version badge', async ({ pageObjects }) => {
      const versionBadge = await pageObjects.gettingStarted.getKibanaVersionBadge();
      await expect(versionBadge).toBeVisible();
    });

    test('verifies viewer has no access to Search API keys', async ({ pageObjects }) => {
      // The Search API key form (requires cluster:manage) shows a no-access message for viewers.
      // Connection Details flyout tab visibility is environment-dependent and covered separately.
      const noAccessMessage = await pageObjects.gettingStarted.getNoApiKeysAccessMessage();
      await expect(noAccessMessage).toBeVisible();
    });
  }
);
