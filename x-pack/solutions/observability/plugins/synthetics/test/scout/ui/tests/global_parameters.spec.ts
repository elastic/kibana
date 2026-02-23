/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';

test.describe('GlobalParameters', { tag: tags.stateful.classic }, () => {
  test.beforeAll(async ({ syntheticsServices }) => {
    await syntheticsServices.deleteParams();
  });

  test.afterAll(async ({ syntheticsServices }) => {
    await syntheticsServices.deleteParams();
  });

  test('creates, edits, searches, and deletes global parameters', async ({
    page,
    browserAuth,
    kbnUrl,
  }) => {
    await test.step('login and navigate to params settings', async () => {
      await browserAuth.loginAsAdmin();
      await page.goto(kbnUrl.get('/app/synthetics/settings/params'));
    });

    await test.step('create parameter', async () => {
      await page.click('text=No items found');
      await page.click('button:has-text("Create Parameter")');
      await page.fill('[aria-label="Key"]', 'username');
      await page.fill('[aria-label="Value"]', 'elastic');
      await page.click('.euiComboBox__inputWrap');
      await page.fill('[aria-label="Tags"]', 'dev');
      await page.fill('[aria-label="Description"]', 'website username');
      await page.click('button:has-text("Save")');
      await expect(page.getByText('website username')).toBeVisible();
      await expect(page.getByText('username')).toBeVisible();
    });

    await test.step('toggle value visibility', async () => {
      await page.click('[aria-label="View parameter value"]');
      await expect(page.locator('tbody >> text=elastic')).toBeVisible();
      await page.click('[aria-label="View parameter value"]');
      await expect(page.getByText('•••••••')).toBeVisible();
    });

    await test.step('search parameters', async () => {
      await page.fill('[placeholder="Search..."]', 'username');
      await expect(page.getByText('username')).toBeVisible();
      await page.click('[aria-label="Clear search input"]');
      await page.fill('[placeholder="Search..."]', 'extra');
      await page.keyboard.press('Enter');
      await expect(page.getByText('No items found')).toBeVisible();
      await page.click('[aria-label="Clear search input"]');
    });

    await test.step('edit parameter', async () => {
      await page.click('text=Delete ParameterEdit Parameter >> :nth-match(button, 2)');
      await page.fill('[aria-label="Key"]', 'username2');
      await page.fill('[aria-label="New value"]', 'elastic2');
      await page.click('.euiComboBox__inputWrap');
      await page.fill('[aria-label="Tags"]', 'staging');
      await page.press('[aria-label="Tags"]', 'Enter');
      await page.click('button:has-text("Save")');
      await expect(page.getByText('username2')).toBeVisible();
    });

    await test.step('delete parameter', async () => {
      await page.click('text=Delete ParameterEdit Parameter >> button');
      await page.click('button:has-text("Delete")');
      await expect(page.getByText('No items found')).toBeVisible();
    });
  });
});
