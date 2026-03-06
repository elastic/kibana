/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest, tags } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';

spaceTest.describe(
  'AI Assistant settings permissions',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.alertsTablePage.navigate();
      await pageObjects.alertsTablePage.waitForDetectionsAlertsWrapper();
    });

    spaceTest('shows enabled Try AI Agent action for admin users', async ({ page }) => {
      await page.testSubj.locator('assistantNavLink').click();
      await expect(page.testSubj.locator('assistantChat')).toBeVisible();

      const settingsMenuButton = page.testSubj.locator('chat-context-menu');
      await expect(settingsMenuButton).toBeEnabled({ timeout: 60_000 });
      await settingsMenuButton.click();
      await expect(page.testSubj.locator('try-ai-agent')).toBeEnabled();
    });
  }
);
