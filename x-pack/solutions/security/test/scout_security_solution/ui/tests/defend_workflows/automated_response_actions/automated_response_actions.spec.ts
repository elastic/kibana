/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../../fixtures';

test.describe(
  'Automated response actions',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test('should display automated response actions page', async ({ page, pageObjects }) => {
      await pageObjects.endpointList.goto();
      await page.goto('/app/security/administration/automated_response_actions');
      await expect(page.locator('text=Automated response actions').first()).toBeVisible({ timeout: 15_000 });
    });
  }
);
