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
      await page.testSubj.click('syntheticsAddParamFlyoutButton');
      await page.testSubj.fill('syntheticsAddParamFormFieldText', 'username');
      await page.testSubj.fill('syntheticsAddParamFormTextArea', 'elastic');
      await page.click('.euiComboBox__inputWrap');
      await page.fill('[aria-label="Tags"]', 'dev');
      await page.testSubj.fill('syntheticsAddParamFormFieldText', 'website username');
      await page.click('text=Save');
      await expect(page.getByText('website username', { exact: true })).toBeVisible();
      await expect(page.getByText('username', { exact: true })).toBeVisible();
    });

    await test.step('toggle value visibility', async () => {
      await page.testSubj.click('syntheticsParamsTextButton');
      // await expect(page.locator('tbody >> text=elastic')).toBeVisible();
      const cellLocator = page.locator(
        '.euiTableCellContent:has([data-test-subj="syntheticsParamsTextButton"]'
      );
      await expect(cellLocator.locator('text=elastic')).toBeVisible();
      await page.testSubj.click('syntheticsParamsTextButton');
      await expect(cellLocator.locator('text=••••••••••')).toBeVisible();
    });

    await test.step('search parameters', async () => {
      await page.fill('[placeholder="Search..."]', 'username');
      await expect(page.getByText('username', { exact: true })).toBeVisible();
      await page.click('[aria-label="Clear search input"]');
      await page.fill('[placeholder="Search..."]', 'extra');
      await page.keyboard.press('Enter');
      await expect(page.getByText('No items found', { exact: true })).toBeVisible();
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
      await expect(page.getByText('username2', { exact: true })).toBeVisible();
    });

    await test.step('delete parameter', async () => {
      await page.click('text=Delete ParameterEdit Parameter >> button');
      await page.click('button:has-text("Delete")');
      await expect(page.getByText('No items found', { exact: true })).toBeVisible();
    });
  });
});
