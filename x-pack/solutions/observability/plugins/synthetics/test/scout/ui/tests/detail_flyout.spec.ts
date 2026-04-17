/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';

test.describe('MonitorDetailFlyout', { tag: tags.stateful.classic }, () => {
  const monitorName = 'test-flyout-http-monitor';
  let locationLabel: string;
  let locationId: string;

  test.beforeAll(async ({ syntheticsServices }) => {
    await syntheticsServices.enable();
    await syntheticsServices.deleteMonitors();
    const location = await syntheticsServices.ensurePrivateLocationExists();
    locationLabel = location.label;
    locationId = location.id;
  });

  test.afterAll(async ({ syntheticsServices }) => {
    await syntheticsServices.deleteMonitors();
  });

  test('creates HTTP monitor and opens detail flyout', async ({
    pageObjects,
    page,
    browserAuth,
  }) => {
    await test.step('login and navigate to add monitor', async () => {
      await browserAuth.loginAsPrivilegedUser();
      await pageObjects.syntheticsApp.navigateToAddMonitor();
      await pageObjects.syntheticsApp.ensureIsOnMonitorConfigPage();
    });

    await test.step('create HTTP monitor', async () => {
      await pageObjects.syntheticsApp.createBasicHTTPMonitorDetails({
        name: monitorName,
        url: 'https://www.elastic.co',
        apmServiceName: 'dev',
        locations: [locationLabel],
      });
      await pageObjects.syntheticsApp.confirmAndSave();
    });

    await test.step('open overview flyout', async () => {
      await page.testSubj.click('syntheticsMonitorOverviewTab');
      await expect(page.getByText(monitorName)).toBeVisible();
      await page.testSubj.click(`${monitorName}-${locationId}-metric-item`);
      const flyoutHeader = page.locator('.euiFlyoutHeader');
      await expect(flyoutHeader).toContainText(monitorName);
    });
  });
});
