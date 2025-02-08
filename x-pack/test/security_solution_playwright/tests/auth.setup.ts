/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test as setup, expect } from '../fixtures';

export const elasticUserFile = 'playwright/.auth/elastic.json';

setup('authenticate as superuser', async ({ page }) => {
  // Perform authentication steps. Replace these actions with your own.
  await page.goto('/login');
  await page.waitForURL('**/login');
  await page.getByTestId('loginUsername').fill('elastic');
  await page.getByTestId('loginPassword').fill('changeme');
  await page.getByLabel('Password', { exact: true }).press('Enter');
  await page.waitForURL('**/app/home');

  // eslint-disable-next-line playwright/no-standalone-expect
  await expect(page.getByTestId('globalLoadingIndicator-hidden')).toBeVisible();

  await page.context().storageState({ path: elasticUserFile });
});
