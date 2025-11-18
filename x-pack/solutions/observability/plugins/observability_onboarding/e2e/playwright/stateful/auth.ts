/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test as ess_auth, expect } from '@playwright/test';
import { STORAGE_STATE } from '../playwright.config';
import { waitForOneOf } from '../lib/helpers';
import { log } from '../lib/logger';
import { assertEnv } from '../lib/assert_env';

const isLocalCluster = process.env.CLUSTER_ENVIRONMENT === 'local';
const isServerless = process.env.CLUSTER_ENVIRONMENT === 'serverless';

ess_auth('Authentication', async ({ page }) => {
  assertEnv(process.env.KIBANA_BASE_URL, 'KIBANA_BASE_URL is not defined.');
  assertEnv(process.env.KIBANA_USERNAME, 'KIBANA_USERNAME is not defined.');
  assertEnv(process.env.KIBANA_PASSWORD, 'KIBANA_PASSWORD is not defined.');

  await page.goto(process.env.KIBANA_BASE_URL);
  if (isServerless) {
    log.info('Using serverless login flow');
    await loginServerless(page);
  } else {
    log.info('Using stateful login flow');
    await loginStateful(page);
  }

  const [index] = await waitForOneOf([
    page.getByTestId('helpMenuButton'),
    page.getByText('Select your space'),
    page.getByTestId('loginErrorMessage'),
  ]);

  const spaceSelector = index === 1;
  const isAuthenticated = index === 0;

  if (isAuthenticated) {
    await page.context().storageState({ path: STORAGE_STATE });
  } else if (spaceSelector) {
    await page.getByRole('link', { name: 'Default' }).click();
    await expect(page.getByTestId('helpMenuButton')).toBeVisible();
    await page.context().storageState({ path: STORAGE_STATE });
  } else {
    log.error('Username or password is incorrect.');
    throw new Error('Authentication is failed.');
  }
});

async function loginStateful(page: import('@playwright/test').Page) {
  log.info('...waiting for login page elements to appear.');

  if (!isLocalCluster) {
    await page.getByRole('button', { name: 'Log in with Elasticsearch' }).click();
  }

  await page.getByLabel('Username').fill(process.env.KIBANA_USERNAME!);
  await page.getByLabel('Password', { exact: true }).click();
  await page.getByLabel('Password', { exact: true }).fill(process.env.KIBANA_PASSWORD!);
  await page.getByRole('button', { name: 'Log in' }).click();
}

async function loginServerless(page: import('@playwright/test').Page) {
  const emailInput = page
    .getByPlaceholder(/email/i)
    .first()
    .or(page.locator('input[type="email"]'))
    .or(page.locator('form input').first());
  const passwordInput = page
    .getByPlaceholder(/password/i)
    .first()
    .or(page.locator('input[type="password"]'));
  const loginBtn = page.getByRole('button', { name: /log in/i });

  await emailInput.fill(process.env.KIBANA_USERNAME!);
  await emailInput.evaluate((el) => (el as HTMLElement).blur());

  await passwordInput.fill(process.env.KIBANA_PASSWORD!);
  await passwordInput.evaluate((el) => (el as HTMLElement).blur());

  await expect(loginBtn).toBeEnabled();
  await loginBtn.click();
}
