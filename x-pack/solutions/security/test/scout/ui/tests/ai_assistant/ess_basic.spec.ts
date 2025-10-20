/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test } from '@kbn/scout-security';
import { API_BASE_PATH } from '@kbn/license-management-plugin/common/constants';

test.describe('AI Assistant - Basic License', { tag: ['@ess'] }, () => {
  test.beforeEach(async ({ browserAuth, kbnClient }) => {
    await browserAuth.loginAsAdmin();

    // Start basic license
    await kbnClient.request({
      method: 'POST',
      path: `${API_BASE_PATH}/start_basic?acknowledge=true`,
    });
  });

  test('user with Basic license should not be able to use assistant', async ({
    page,
    pageObjects,
  }) => {
    await page.gotoApp('security', { path: '/get_started' });
    await pageObjects.assistantPage.open();

    // Verify upgrade callout is visible
    await pageObjects.assistantPage.expectUpgradeCallout();

    // Verify conversation is read-only
    await pageObjects.assistantPage.expectConversationReadOnly();
  });
});
