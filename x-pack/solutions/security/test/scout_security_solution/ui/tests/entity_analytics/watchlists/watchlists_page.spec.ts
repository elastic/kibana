/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';

const WATCHLISTS_URL = '/app/security/entity_analytics_threat_hunting';

test.describe(
  'Entity Analytics Watchlists Management Page',
  {
    tag: [...tags.stateful.classic, ...tags.serverless.security.complete],
  },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test('renders watchlists page as expected', async ({ page }) => {
      await page.goto(WATCHLISTS_URL);
      await page.waitForURL(new RegExp(WATCHLISTS_URL));

      const pageTitle = page.testSubj.locator('threatHuntingPage');
      await expect(pageTitle).toBeVisible({ timeout: 60_000 });
    });
  }
);
