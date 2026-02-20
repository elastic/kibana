/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../fixtures';

test.describe(
  'App Features for Security Essentials - AI Assistant',
  { tag: [...tags.serverless.security.essentials] },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test('should not have AI Assistant available', async ({
      pageObjects,
    }) => {
      await pageObjects.aiAssistant.gotoGetStarted();
      await expect(pageObjects.aiAssistant.aiAssistantButton).not.toBeAttached();
    });
  }
);
