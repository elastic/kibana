/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';

test.describe('MonitorSelector', { tag: tags.stateful.classic }, () => {
  const testMonitor1 = 'Test monitor 1';
  const testMonitor2 = 'Test monitor 2';
  const testMonitor3 = 'Test monitor 3';

  test.beforeAll(async ({ syntheticsServices }) => {
    await syntheticsServices.enable();
    await syntheticsServices.deleteMonitors();
    await syntheticsServices.addMonitorSimple(testMonitor1);
    await syntheticsServices.addMonitorSimple(testMonitor2);
    await syntheticsServices.addMonitorSimple(testMonitor3);
  });

  test.afterAll(async ({ syntheticsServices }) => {
    await syntheticsServices.deleteMonitors();
  });

  test('navigates between monitors using the selector', async ({
    pageObjects,
    page,
    browserAuth,
  }) => {
    await test.step('login and navigate to monitor management', async () => {
      await browserAuth.loginAsViewer();
      await pageObjects.syntheticsApp.navigateToMonitorManagement();
    });

    await test.step('go to monitor 1', async () => {
      await page.click(`text=${testMonitor1}`);
    });

    await test.step('switch monitors using selector', async () => {
      await expect(page.testSubj.locator('monitorNameTitle')).toHaveText(testMonitor1);

      await pageObjects.syntheticsApp.selectMonitorFromSelector(testMonitor2);

      await page.click('[aria-label="Select a different monitor to view its details"]');
      await page.click('text=Recently viewed');
      await page.click('text=Other monitors');
      await page.click(`text=${testMonitor3}`);

      await page.click('[aria-label="Select a different monitor to view its details"]');
      await page.fill('[placeholder="Monitor name or tag"]', '2');
      await page.click(`text=${testMonitor2}`);

      await page.click('[aria-label="Select a different monitor to view its details"]');
    });
  });
});
