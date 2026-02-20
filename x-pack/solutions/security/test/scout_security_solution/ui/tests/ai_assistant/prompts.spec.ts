/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../fixtures';

test.describe(
  'AI Assistant Prompts',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test('should open assistant and show prompt selector', async ({
      pageObjects,
      page,
    }) => {
      await pageObjects.aiAssistant.gotoGetStarted();
      await pageObjects.aiAssistant.aiAssistantButton.first().click();
      await expect(page.getByText(/prompt|system/i).first()).toBeVisible({ timeout: 10000 });
    });
  }
);
