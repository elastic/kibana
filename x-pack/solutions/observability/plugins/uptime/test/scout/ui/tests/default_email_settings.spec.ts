/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';

const queryParams = new URLSearchParams({
  dateRangeStart: '2021-11-21T22:06:06.502Z',
  dateRangeEnd: '2021-11-21T22:10:08.203Z',
}).toString();

test.describe('DefaultEmailSettings', { tag: tags.stateful.classic }, () => {
  test('configures email connector and validates settings', async ({
    pageObjects,
    browserAuth,
    page,
  }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.uptimeSettings.goto(queryParams);

    // Clear existing settings
    await page.testSubj.locator('"default-connectors-input-loaded"').waitFor();
    await page.waitForTimeout(10 * 1000);
    const toEmailInput = await page.testSubj.locator('toEmailAddressInput').isVisible();

    if (toEmailInput) {
      await page
        .locator('[data-test-subj=toEmailAddressInput] >> [data-test-subj=comboBoxClearButton]')
        .click();
      await page
        .locator(
          '[data-test-subj="default-connectors-input-loaded"] >> [data-test-subj=comboBoxClearButton]'
        )
        .click();
      await pageObjects.uptimeSettings.saveSettings();
    }

    // Add email connector
    await page.testSubj.click('createConnectorButton');
    await page.testSubj.click('".email-card"');
    await page.testSubj.locator('nameInput').fill('Test connector');
    await page.testSubj.locator('emailFromInput').fill('test@gmail.com');
    await page.testSubj.locator('emailServiceSelectInput').selectOption('other');
    await page.testSubj.locator('emailHostInput').fill('test');
    await page.testSubj.locator('emailPortInput').fill('1025');
    await page.click('text=Require authentication for this server');
    await page.testSubj.click('create-connector-flyout-save-btn');

    // Select email connector
    await expect(page.locator('text=Bcc')).not.toBeVisible();
    await page.testSubj.click('default-connectors-input-loaded');
    await page.testSubj.click('"Test connector"');
    await expect(page.locator('text=Bcc')).toBeVisible();
    await expect(page.locator('text=To email is required for email connector')).toBeVisible();
    await pageObjects.uptimeSettings.assertApplyDisabled();
    await pageObjects.uptimeSettings.fillToEmail('test@gmail.com');
    await pageObjects.uptimeSettings.assertApplyEnabled();

    // Check for invalid email
    await pageObjects.uptimeSettings.fillToEmail('test@gmail');
    await expect(page.locator('text=test@gmail is not a valid email.')).toBeVisible();
    await pageObjects.uptimeSettings.assertApplyDisabled();
    await pageObjects.uptimeSettings.removeInvalidEmail('test@gmail');

    // Save settings
    await pageObjects.uptimeSettings.saveSettings();
  });
});
