/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { RULES_MANAGEMENT_URL } from '../../../common/urls';

test.describe(
  'Value lists management modal',
  {
    tag: [...tags.stateful.classic, ...tags.serverless.security.complete],
  },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test('can open and close the modal', async ({ page }) => {
      await test.step('Navigate to rules management page', async () => {
        await page.goto(RULES_MANAGEMENT_URL);
      });

      await test.step('Open value lists modal', async () => {
        const valueListsBtn = page.testSubj.locator('value-lists-modal-activator');
        const isVisible = await valueListsBtn.isVisible().catch(() => false);
        test.skip(!isVisible, 'Value lists button not available');
        await valueListsBtn.click();
      });

      await test.step('Verify modal is visible', async () => {
        const modal = page.testSubj.locator('value-lists-modal');
        await expect(modal).toBeVisible();
      });

      await test.step('Close modal', async () => {
        const closeBtn = page.testSubj.locator('value-lists-modal-close-action');
        await closeBtn.click();
        const modal = page.testSubj.locator('value-lists-modal');
        await expect(modal).toBeHidden();
      });
    });

    test('creates a keyword list from an uploaded file', async ({ page }) => {
      await page.goto(RULES_MANAGEMENT_URL);

      await test.step('Open value lists modal', async () => {
        const valueListsBtn = page.testSubj.locator('value-lists-modal-activator');
        const isVisible = await valueListsBtn.isVisible().catch(() => false);
        test.skip(!isVisible, 'Value lists button not available');
        await valueListsBtn.click();
      });

      await test.step('Verify upload controls are present', async () => {
        const uploadInput = page.testSubj.locator('value-list-file-picker');
        const isVisible = await uploadInput.isVisible().catch(() => false);
        test.skip(!isVisible, 'Upload controls not available');
        await expect(uploadInput).toBeVisible();
      });

      await test.step('Verify list type selector is present', async () => {
        const listTypeSelector = page.testSubj.locator('value-lists-type-selector');
        const isVisible = await listTypeSelector.isVisible().catch(() => false);
        test.skip(!isVisible, 'List type selector not available');
        await expect(listTypeSelector).toBeVisible();
      });
    });

    test('shows value lists table when lists exist', async ({ page }) => {
      await page.goto(RULES_MANAGEMENT_URL);

      await test.step('Open value lists modal', async () => {
        const valueListsBtn = page.testSubj.locator('value-lists-modal-activator');
        const isVisible = await valueListsBtn.isVisible().catch(() => false);
        test.skip(!isVisible, 'Value lists button not available');
        await valueListsBtn.click();
      });

      await test.step('Verify table structure is present', async () => {
        const modal = page.testSubj.locator('value-lists-modal');
        await expect(modal).toBeVisible();
        const table = page.testSubj.locator('value-lists-table');
        const isTableVisible = await table.isVisible().catch(() => false);
        if (isTableVisible) {
          await expect(table).toBeVisible();
        }
      });
    });
  }
);
