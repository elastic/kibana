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
    pageObjects,
    browserAuth,
  }) => {
    await test.step('login and navigate to params settings', async () => {
      await browserAuth.loginAsAdmin();
      await pageObjects.syntheticsApp.navigateToParamsSettings();
    });

    await test.step('create parameter', async () => {
      await pageObjects.syntheticsApp.createGlobalParameter({
        key: 'username',
        value: 'elastic',
        tags: ['dev'],
        description: 'website username',
      });
      await expect(page.getByText('website username')).toBeVisible();
      await expect(page.getByText('username', { exact: true })).toBeVisible();
    });

    await test.step('toggle value visibility', async () => {
      await page.testSubj.click('syntheticsParamsTextButton');
      await expect(page.testSubj.locator('syntheticsParamsText')).toContainText('elastic');
      await page.testSubj.click('syntheticsParamsTextButton');
      await expect(page.testSubj.locator('syntheticsParamsText')).toContainText('•••••••');
    });

    await test.step('search parameters', async () => {
      await expect(page.testSubj.locator('syntheticsParamsTable-loaded')).toBeVisible();
      await page.testSubj.typeWithDelay('syntheticsParamsSearchInput', 'username', { delay: 100 });
      await page.testSubj.locator('syntheticsParamsSearchInput').press('Enter');
      await expect(page.testSubj.locator('syntheticsParamsTable-loaded')).toBeVisible();
      await page.testSubj.locator('syntheticsParamsSearchInput').clear();
      await page.testSubj.typeWithDelay('syntheticsParamsSearchInput', 'extra', { delay: 100 });
      await page.testSubj.locator('syntheticsParamsSearchInput').press('Enter');
      await expect(page.testSubj.locator('syntheticsParamsTable-loaded')).toBeVisible();
      await expect(page.locator('.euiTableRow-isSelectable')).toHaveCount(0);
      await page.testSubj.locator('syntheticsParamsSearchInput').clear();
    });

    await test.step('edit parameter', async () => {
      await pageObjects.syntheticsApp.editGlobalParameter({
        key: 'username2',
        newValue: 'elastic2',
        tags: ['staging'],
      });
      await expect(page.getByText('username2')).toBeVisible();
    });

    await test.step('delete parameter', async () => {
      await pageObjects.syntheticsApp.deleteGlobalParameter();
      await expect(page.locator('.euiTableRow-isSelectable')).toHaveCount(0);
    });
  });
});
