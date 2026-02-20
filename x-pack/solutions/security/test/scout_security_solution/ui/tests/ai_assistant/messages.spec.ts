/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../fixtures';
import { CASES_URL } from '../../common/urls';

test.describe(
  'AI Assistant Messages',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test('AI Assistant can be opened from Cases page', async ({
      pageObjects,
      page,
    }) => {
      await page.goto(CASES_URL);
      await pageObjects.aiAssistant.aiAssistantButton.first().click();
      await expect(page.getByRole('button', { name: /assistant|chat/i }).first()).toBeVisible({
        timeout: 10000,
      });
    });
  }
);
