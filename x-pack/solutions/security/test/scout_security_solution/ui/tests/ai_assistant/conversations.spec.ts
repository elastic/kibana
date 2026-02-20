/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../fixtures';

test.describe(
  'AI Assistant Conversations',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test('Shows welcome setup when no connectors or conversations exist', async ({
      pageObjects,
      page,
    }) => {
      await pageObjects.aiAssistant.gotoGetStarted();
      await pageObjects.aiAssistant.aiAssistantButton.first().click();
      await expect(page.getByText('New chat').first()).toBeVisible();
    });

    test('should have AI Assistant button visible on get started page', async ({
      pageObjects,
    }) => {
      await pageObjects.aiAssistant.gotoGetStarted();
      await expect(pageObjects.aiAssistant.aiAssistantButton.first()).toBeVisible();
    });
  }
);
