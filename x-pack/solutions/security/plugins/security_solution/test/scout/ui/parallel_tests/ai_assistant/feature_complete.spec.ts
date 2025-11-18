/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, test } from '@kbn/scout-security';
import { SecurityGetStartedPage } from '../../page_objects/security_get_started_page';

test.describe('App Features for Security Complete', { tag: ['@svlSecurity'] }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAs('admin');
  });

  test('should have have AI Assistant available', async ({ page }) => {
    const getStartedPage = new SecurityGetStartedPage(page);
    await getStartedPage.goto();
    await expect(getStartedPage.aiAssistantButton).toBeVisible();
  });
});
