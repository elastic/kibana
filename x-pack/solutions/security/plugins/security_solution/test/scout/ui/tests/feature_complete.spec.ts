/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-security/ui';
import { test } from '../fixtures';
import { waitForPageReady } from '../common/constants';

test.describe('App Features for Security Complete', { tag: ['@svlSecurity'] }, () => {
  test('should have AI Assistant available', async ({ browserAuth, page, pageObjects, kbnUrl }) => {
    await browserAuth.loginAsAdmin();
    await page.goto(kbnUrl.get('/app/security/get_started'));
    await waitForPageReady(page);
    await expect(pageObjects.assistant.assistantButton).toBeVisible();
  });
});
