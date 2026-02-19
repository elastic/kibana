/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';

const queryParams = {
  dateRangeStart: '2021-11-21T22:06:06.502Z',
  dateRangeEnd: '2021-11-21T22:10:08.203Z',
};

test.describe('DefaultEmailSettings', { tag: tags.stateful.classic }, () => {
  test('configures email connector and validates settings', async ({
    pageObjects,
    browserAuth,
    page,
  }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.uptimeSettings.goto(queryParams);

    await test.step('clear existing settings', async () => {
      await pageObjects.uptimeSettings.waitForDefaultConnectorsLoaded();
      await pageObjects.uptimeSettings.clearToEmailAddresses();
      await pageObjects.uptimeSettings.clearDefaultConnectors();
      await pageObjects.uptimeSettings.clickSaveSettings();
    });

    await test.step('create email connector', async () => {
      await pageObjects.uptimeSettings.createEmailConnector({
        name: 'Test connector',
        from: 'test@gmail.com',
        host: 'test',
        port: '1025',
      });
    });

    await test.step('select email connector and validate required fields', async () => {
      await expect(page.getByText('Bcc')).toBeHidden();
      await pageObjects.uptimeSettings.selectDefaultConnector('Test connector');
      await expect(page.getByText('Bcc')).toBeVisible();
      await expect(page.getByText('To email is required for email connector')).toBeVisible();
      await expect(pageObjects.uptimeSettings.getApplyButton()).toBeDisabled();
      await pageObjects.uptimeSettings.fillToEmail('test@gmail.com');
      await expect(pageObjects.uptimeSettings.getApplyButton()).toBeEnabled();
    });

    await test.step('validate invalid email handling', async () => {
      await pageObjects.uptimeSettings.fillToEmail('test@gmail');
      await expect(page.getByText('test@gmail is not a valid email.')).toBeVisible();
      await expect(pageObjects.uptimeSettings.getApplyButton()).toBeDisabled();
      await pageObjects.uptimeSettings.removeInvalidEmail('test@gmail');
    });

    await test.step('save settings', async () => {
      await pageObjects.uptimeSettings.clickSaveSettings();
      await expect(page.getByText('Settings saved!')).toBeVisible();
    });
  });
});
