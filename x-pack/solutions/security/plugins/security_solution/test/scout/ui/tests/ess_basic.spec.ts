/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-security/ui';
import { test } from './fixtures';
import { waitForPageReady } from './common/constants';

// NOTE: This test requires ability to downgrade to Basic license in Scout.
// The startBasicLicense API call may not work in all Scout environments.
// TODO: Validate license manipulation works in Scout before enabling.
test.describe.skip('AI Assistant - Basic License', { tag: ['@ess'] }, () => {
  test('user with Basic license should not be able to use assistant', async ({
    browserAuth,
    page,
    pageObjects,
    kbnUrl,
  }) => {
    // TODO: startBasicLicense equivalent for Scout
    await browserAuth.loginAsAdmin();
    await page.goto(kbnUrl.get('/app/security/get_started'));
    await waitForPageReady(page);
    await pageObjects.assistant.openAssistant();
    await expect(pageObjects.assistant.upgradeCta).toBeVisible();
    await pageObjects.assistant.assertConversationReadOnly();
  });
});
