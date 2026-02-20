/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../../fixtures';

test.describe(
  'Automated response actions - results',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test('should display automated response action results', async ({ page }) => {
      await page.goto('/app/security/administration/automated_response_actions');
      await expect(page.testSubj.locator('automatedResponseActionsList').first()).toBeVisible({
        timeout: 15_000,
      });
    });
  }
);
