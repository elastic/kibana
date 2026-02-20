/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../../fixtures';
import { APP_BLOCKLIST_PATH } from '../../../../common/defend_workflows_urls';

test.describe(
  'Blocklist',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test('should display blocklist page', async ({ page, pageObjects }) => {
      await pageObjects.artifacts.goto('blocklist');
      await pageObjects.artifacts.waitForPage('blocklist');
      await expect(page).toHaveURL(new RegExp(`.*${APP_BLOCKLIST_PATH}.*`));
      await expect(
        page.locator('[data-test-subj^="blocklistPage"]').first()
      ).toBeVisible();
    });
  }
);
