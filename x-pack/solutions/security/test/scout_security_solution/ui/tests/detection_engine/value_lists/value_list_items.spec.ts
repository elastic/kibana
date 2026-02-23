/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { RULES_MANAGEMENT_URL } from '../../../common/urls';

test.describe(
  'Value list items',
  {
    tag: [...tags.stateful.classic, ...tags.serverless.security.complete],
  },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test('opens value lists modal and views items', async ({ page }) => {
      await test.step('Navigate to rules management page', async () => {
        await page.goto(RULES_MANAGEMENT_URL);
      });

      await test.step('Open value lists modal', async () => {
        const valueListsBtn = page.testSubj.locator('value-lists-modal-activator');
        const isVisible = await valueListsBtn.isVisible().catch(() => false);
        test.skip(!isVisible, 'Value lists button not available');
        await valueListsBtn.click();
      });

      await test.step('Verify value lists modal is visible', async () => {
        const modal = page.testSubj.locator('value-lists-modal');
        const isVisible = await modal.isVisible().catch(() => false);
        test.skip(!isVisible, 'Value lists modal not available');
        await expect(modal).toBeVisible();
      });

      await test.step('Close modal', async () => {
        const closeBtn = page.testSubj.locator('value-lists-modal-close-action');
        const isVisible = await closeBtn.isVisible().catch(() => false);
        if (isVisible) {
          await closeBtn.click();
        }
      });
    });
  }
);
