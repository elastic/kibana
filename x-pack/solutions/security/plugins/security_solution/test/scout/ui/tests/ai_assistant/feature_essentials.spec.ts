/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, spaceTest } from '@kbn/scout-security';

spaceTest.describe('App Features for Security Essentials', { tag: ['@svlSecurity'] }, () => {
  spaceTest.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  spaceTest('should not have AI Assistant available', async ({ page, pageObjects }) => {
    await page.gotoApp('security', { path: '/get_started' });

    // AI Assistant button should not be visible in Security Essentials tier
    await expect(pageObjects.assistantPage.locators.assistantButton).not.toBeVisible();
  });
});
