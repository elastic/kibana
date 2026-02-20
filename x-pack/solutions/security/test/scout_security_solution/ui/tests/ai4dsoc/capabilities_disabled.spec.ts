/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../fixtures';
import { APP_DASHBOARDS_URL, VISUALIZE_URL, MAPS_URL, LENS_URL } from '../../common/urls';

test.describe('AI4dSoC Disabled features', { tag: [...tags.serverless.security.complete] }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  test('dashboards app should not be available', async ({ pageObjects }) => {
    await pageObjects.ai4dsoc.goto(APP_DASHBOARDS_URL);
    await expect(pageObjects.ai4dsoc.appNotFoundPage.first()).toBeVisible();
  });

  test('visualize app should not be available', async ({ pageObjects }) => {
    await pageObjects.ai4dsoc.goto(VISUALIZE_URL);
    await expect(pageObjects.ai4dsoc.appNotFoundPage.first()).toBeVisible();
  });

  test('maps app should not be available', async ({ pageObjects }) => {
    await pageObjects.ai4dsoc.goto(MAPS_URL);
    await expect(pageObjects.ai4dsoc.appNotFoundPage.first()).toBeVisible();
  });

  test('lens app should not be available', async ({ pageObjects }) => {
    await pageObjects.ai4dsoc.goto(LENS_URL);
    await expect(pageObjects.ai4dsoc.appNotFoundPage.first()).toBeVisible();
  });
});
