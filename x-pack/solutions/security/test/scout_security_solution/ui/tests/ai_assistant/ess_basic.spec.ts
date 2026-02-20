/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../fixtures';
import { startBasicLicense } from '../../common/api_helpers';

test.describe(
  'AI Assistant - Basic License',
  { tag: [...tags.stateful.classic] },
  () => {
    test.beforeEach(async ({ browserAuth, kbnClient, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await startBasicLicense(kbnClient);
      await pageObjects.aiAssistant.gotoGetStarted();
    });

    test('user with Basic license should not be able to use assistant', async ({
      pageObjects,
    }) => {
      await pageObjects.aiAssistant.aiAssistantButton.first().click();
      await expect(pageObjects.aiAssistant.upgradeCta.first()).toBeVisible();
    });
  }
);
