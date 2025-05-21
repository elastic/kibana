/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, type Page } from '@playwright/test';
import { STORAGE_STATE } from '../playwright.config';
import { waitForOneOf } from '../lib/helpers';
import { log } from '../lib/logger';
import { assertEnv } from '../lib/assert_env';

const isLocalCluster = process.env.CLUSTER_ENVIRONMENT === 'local';

export async function serverlessAuth(page: Page) {
  assertEnv(process.env.KIBANA_BASE_URL, 'KIBANA_BASE_URL is not defined.');
  assertEnv(process.env.KIBANA_USERNAME, 'KIBANA_USERNAME is not defined.');
  assertEnv(process.env.KIBANA_PASSWORD, 'KIBANA_PASSWORD is not defined.');

  const loginURL = isLocalCluster
    ? `${process.env.KIBANA_BASE_URL}/login`
    : process.env.KIBANA_BASE_URL;

  await page.goto(loginURL);
  log.info(`...waiting for login page elements to appear.`);

  if (isLocalCluster) {
    await page.getByLabel('Username').fill(process.env.KIBANA_USERNAME);
  } else {
    await page.getByLabel('Email').fill(process.env.KIBANA_USERNAME);
  }
  await page.getByLabel('Password', { exact: true }).click();
  await page.getByLabel('Password', { exact: true }).fill(process.env.KIBANA_PASSWORD);
  await page.getByRole('button', { name: 'Log in' }).click();

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
}
