/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt';
import { test } from '../fixtures';

test.describe('Alert Details Page', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  test('should show error when the alert does not exist', async ({ page, pageObjects }) => {
    await pageObjects.alertPage.goto('non-existent-alert-id');
    await expect(page.testSubj.locator('alertDetailsError')).toBeVisible();
  });
});
