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
    await syntheticsServices.cleanSettings();
  });

  test.afterAll(async ({ syntheticsServices }) => {
    await syntheticsServices.cleanSettings();
  });

  test('configures alerting defaults and verifies viewer restrictions', async ({
    pageObjects,
    page,
    browserAuth,
  }) => {
    await test.step('login and navigate to settings', async () => {
      await browserAuth.loginAsAdmin();
      await pageObjects.syntheticsApp.navigateToSettings();
      await page.click('text=Alerting');
    });

    await test.step('add Slack connector', async () => {
      await page.click('button:has-text("Add connector")');
      await page.click('p:has-text("Slack")');
      await page.click('input[type="text"]');
      await page.fill('input[type="text"]', 'Test slack');
      await page.press('input[type="text"]', 'Tab');

      if (
        await page.testSubj
          .locator('webhookButton')
          .isVisible()
          .catch(() => false)
      ) {
        await page.testSubj.click('webhookButton');
      }
      await page.fill(
        'text=Webhook URLCreate a Slack Webhook URL(external, opens in a new tab or window) >> input[type="text"]',
        'https://www.slack.com'
      );
      await page.click('button:has-text("Save")');
      await page.click('.euiComboBox__inputWrap');
      await page.click('button[role="option"]:has-text("Test slack")');
      await page.click("text=You've selected all available options");
      await page.click('button:has-text("Apply changes")');
      await page.click('[aria-label="Remove Test slack from selection in this group"]');
    });

    await test.step('add Email connector', async () => {
      await page.click('button:has-text("Add connector")');
      await page.click('text=Email');
      await page.click('input[type="text"]');
      await page.fill('input[type="text"]', 'Test email');
      await page.press('input[type="text"]', 'Tab');
      await page.selectOption('select', 'gmail');
      await page.click('text=UsernamePassword >> input[type="text"]');
      await page.fill('text=UsernamePassword >> input[type="text"]', 'elastic');
      await page.press('text=UsernamePassword >> input[type="text"]', 'Tab');
      await page.fill('input[type="password"]', 'changeme');
      await page.click('button:has-text("Save")');
      await page.fill(
        'text=Sender is required.Configure email accounts(external, opens in a new tab or window) >> input[type="text"]',
        'test@gmail.com'
      );
      await page.click('button:has-text("Save")');
    });

    await test.step('configure email recipients', async () => {
      await page.click('.euiComboBox__inputWrap');
      await page.click('button[role="option"]:has-text("Test email")');
      await page.testSubj.click('toEmailAddressInput');
      await page.testSubj
        .locator('toEmailAddressInput')
        .locator('[data-test-subj="comboBoxSearchInput"]')
        .fill('test@gmail.com');
      await page.keyboard.press('Enter');
    });

    await test.step('verify viewer restrictions', async () => {
      await browserAuth.loginAsViewer();
      await pageObjects.syntheticsApp.navigateToSettings();
      await page.click('text=Alerting');
      await expect(page.locator('button:has-text("Add connector")')).toBeDisabled();
    });
  });
});
