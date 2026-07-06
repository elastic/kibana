/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';

test.describe('GettingStarted', { tag: tags.stateful.classic }, () => {
  test.beforeAll(async ({ syntheticsServices }) => {
    await syntheticsServices.deleteMonitors();
    await syntheticsServices.ensurePrivateLocationExists();
  });

  test.afterAll(async ({ syntheticsServices }) => {
    await syntheticsServices.deleteMonitors();
    await syntheticsServices.deletePrivateLocations();
  });

  test('creates a basic monitor from getting started page', async ({
    pageObjects,
    page,
    browserAuth,
  }) => {
    await test.step('navigate to monitor management and login', async () => {
      await browserAuth.loginAsPrivilegedUser();
      await pageObjects.syntheticsApp.navigateToGettingStarted();
    });

    await test.step('enable monitor management', async () => {
      await pageObjects.syntheticsApp.enableMonitorManagement(true);
    });

    await test.step('shows validation error on submit', async () => {
      await page.locator('.euiSideNavItem').locator('text=Synthetics').click();
      await page.click('text=Create monitor');
      await expect(page.getByText('URL is required')).toBeVisible();
    });

    await test.step('create basic monitor', async () => {
      await pageObjects.syntheticsApp.fillFirstMonitorDetails({
        url: 'https://www.elastic.co',
        location: 'Test private location',
      });
      await pageObjects.syntheticsApp.confirmAndSave();
    });
  });
});
