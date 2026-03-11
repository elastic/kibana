/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';

test.describe('MonitorFormValidation', { tag: tags.stateful.classic }, () => {
  const existingMonitorName = 'https://amazon.com';

  test.beforeAll(async ({ syntheticsServices }) => {
    await syntheticsServices.enable();
    await syntheticsServices.addMonitor(existingMonitorName, {
      type: 'http',
      urls: existingMonitorName,
      'service.name': 'apmServiceName',
    });
  });

  test.afterAll(async ({ syntheticsServices }) => {
    await syntheticsServices.deleteMonitors();
  });

  test('validates HTTP monitor form fields', async ({ pageObjects, page, browserAuth }) => {
    await test.step('login and navigate to add monitor', async () => {
      await browserAuth.loginAsPrivilegedUser();
      await pageObjects.syntheticsApp.navigateToAddMonitor();
      await pageObjects.syntheticsApp.ensureIsOnMonitorConfigPage();
    });

    await test.step('validate HTTP monitor type', async () => {
      await page.testSubj.click('syntheticsMonitorTypeHTTP');

      await page.testSubj.locator('syntheticsMonitorConfigName').focus();
      await page.testSubj.locator('syntheticsMonitorConfigURL').focus();
      await page.testSubj.locator('syntheticsMonitorConfigLocations').click();
      await page.testSubj.locator('syntheticsMonitorConfigName').click();
      await expect(page.getByText('Monitor name is required')).toBeVisible();

      await page.testSubj.locator('syntheticsMonitorConfigName').fill(existingMonitorName);
      await expect(page.getByText('Monitor name already exists')).toBeVisible();

      await page.testSubj.locator('syntheticsMonitorConfigMaxRedirects').fill('11');

      // await expect(page.getByText('Max redirects is invalid.')).toBeVisible();
      // await page.testSubj.locator('syntheticsMonitorConfigMaxRedirects').clear();
      await page.testSubj.locator('syntheticsMonitorConfigMaxRedirects').fill('3');
      await expect(page.getByText('Max redirects is invalid.')).toBeHidden();

      await page.testSubj.locator('syntheticsMonitorConfigTimeout').fill('-1');
      await expect(page.getByText('Timeout must be greater than or equal to 0.')).toBeVisible();

      await page.testSubj.click('syntheticsMonitorConfigSubmitButton');
      await expect(page.getByText('Please address the highlighted errors.')).toBeVisible();
    });

    await test.step('validate TCP monitor type', async () => {
      await page.testSubj.click('syntheticsMonitorTypeTCP');
      await page.testSubj.locator('syntheticsMonitorConfigName').fill(existingMonitorName);
      await page.testSubj.locator('syntheticsMonitorConfigName').press('Tab');
      await expect(page.getByText('Monitor name already exists')).toBeVisible();

      await page.testSubj.click('syntheticsMonitorConfigSubmitButton');
      await expect(page.getByText('Please address the highlighted errors.')).toBeVisible();
    });

    await test.step('validate ICMP monitor type', async () => {
      await page.testSubj.click('syntheticsMonitorTypeICMP');
      await page.testSubj.locator('syntheticsMonitorConfigName').fill(existingMonitorName);
      await page.testSubj.locator('syntheticsMonitorConfigName').press('Tab');
      await expect(page.getByText('Monitor name already exists')).toBeVisible();

      await page.testSubj.click('syntheticsMonitorConfigSubmitButton');
      await expect(page.getByText('Please address the highlighted errors.')).toBeVisible();
    });

    await test.step('validate Multistep monitor type', async () => {
      await page.testSubj.click('syntheticsMonitorTypeMultistep');
      await page.testSubj.locator('syntheticsMonitorConfigName').focus();
      await page.testSubj.locator('syntheticsMonitorConfigLocations').click();
      await page.testSubj.locator('syntheticsMonitorConfigName').press('Tab');
      await expect(page.getByText('Monitor name is required')).toBeVisible();

      await page.testSubj.click('syntheticsMonitorConfigSubmitButton');
      await expect(page.getByText('Please address the highlighted errors.')).toBeVisible();
    });
  });
});
