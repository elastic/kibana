/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../../fixtures';

test.describe(
  'SIEM Migrations - Dashboards onboarding',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.siemMigrations.goto();
    });
    test('should display dashboards migration section', async ({ page }) => {
      await expect(page.getByTestId('onboarding-siem-migrations-list').first()).toBeVisible({
        timeout: 10_000,
      });
    });
  }
);
