/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../fixtures';

// TODO: Skipped due to https://github.com/elastic/kibana/issues/235416
test.describe.skip(
  'Assistant Conversation Sharing',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test('Share modal works to not share, share globally, and share selected', async ({
      pageObjects,
    }) => {
      await pageObjects.aiAssistant.gotoGetStarted();
      await pageObjects.aiAssistant.aiAssistantButton.first().click();
      await expect(
        pageObjects.aiAssistant.aiAssistantButton.first()
      ).toBeVisible();
    });
  }
);
