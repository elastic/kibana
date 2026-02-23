/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { INDICATORS_URL } from '../../../common/urls';

test.describe(
  'Threat Intelligence - Indicators',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, page }) => {
      await browserAuth.loginAsAdmin();
      await page.goto(INDICATORS_URL);
      await page.testSubj
        .locator('breadcrumbs')
        .first()
        .waitFor({ state: 'visible', timeout: 15_000 });
    });

    test('should render breadcrumb', async ({ page }) => {
      const breadcrumbs = page.getByTestId('breadcrumbs');
      await expect(breadcrumbs.first()).toBeVisible();
    });

    test('should render page title', async ({ page }) => {
      const title = page.getByTestId('default-layout-page-title');
      await expect(title.first()).toContainText('Indicators');
    });
  }
);
