/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';

test.describe('AlertingDefaults', { tag: tags.stateful.classic }, () => {
  test.beforeAll(async ({ syntheticsServices }) => {
    await syntheticsServices.deleteSettingsAndConnectors();
  });

  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.syntheticsApp.navigateToSettings();
  });

  test.afterEach(async ({ syntheticsServices }) => {
    await syntheticsServices.deleteSettingsAndConnectors();
  });

  test('configures alerting defaults: add Slack connector', async ({ pageObjects, page }) => {
    await pageObjects.syntheticsApp.openCreateConnectorFlyout();
    await pageObjects.syntheticsApp.selectConnectorType('slack');
    await page.testSubj.fill('nameInput', 'Test slack');
    await page.testSubj.fill('slackWebhookUrlInput', 'https://www.slack.com');
    await pageObjects.syntheticsApp.saveConnectorInFlyout();

    const defaultConnectors = pageObjects.syntheticsApp.getDefaultConnectorsComboBox();
    await defaultConnectors.selectMultiOption('Test slack');
    expect(await defaultConnectors.getSelectedMultiOptions()).toStrictEqual(['Test slack']);
    await defaultConnectors.clear();
  });

  test('configures alerting defaults: add Email connector', async ({
    pageObjects,
    page,
    browserAuth,
  }) => {
    await test.step('add connector', async () => {
      await pageObjects.syntheticsApp.openCreateConnectorFlyout();
      await pageObjects.syntheticsApp.selectConnectorType('email');
      await page.testSubj.fill('nameInput', 'Test email');
      await page.testSubj.fill('emailFromInput', 'test@gmail.com');
      await page.testSubj.locator('emailServiceSelectInput').selectOption('gmail');
      await page.testSubj.click('emailHasAuthSwitch');
      await pageObjects.syntheticsApp.saveConnectorInFlyout();
    });

    await test.step('configure email recipients', async () => {
      const defaultConnectors = pageObjects.syntheticsApp.getDefaultConnectorsComboBox();
      await defaultConnectors.selectMultiOption('Test email');
      expect(await defaultConnectors.getSelectedMultiOptions()).toStrictEqual(['Test email']);

      await page.testSubj.locator('toEmailAddressInput').locator('input').fill('test@gmail.com');
      await page.keyboard.press('Enter');
    });

    await test.step('verify viewer restrictions', async () => {
      await browserAuth.loginAsViewer();
      await pageObjects.syntheticsApp.navigateToSettings();
      await pageObjects.syntheticsApp.navigateToSettingsTab('Alerting');
      await expect(page.locator('button:has-text("Add connector")')).toBeDisabled();
    });
  });
});
