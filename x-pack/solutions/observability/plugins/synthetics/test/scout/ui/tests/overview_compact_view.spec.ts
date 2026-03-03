/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';

test.describe('OverviewCompactView', { tag: tags.stateful.classic }, () => {
  test.beforeAll(async ({ syntheticsServices }) => {
    await syntheticsServices.cleanUp();
  });

  test.afterAll(async ({ syntheticsServices }) => {
    await syntheticsServices.cleanUp();
  });

  test('switches to compact view and persists the selection', async ({
    pageObjects,
    page,
    browserAuth,
    syntheticsServices,
  }) => {
    await test.step('login and navigate to overview', async () => {
      await browserAuth.loginAsViewer();
      await pageObjects.syntheticsApp.navigateToOverview(15);
    });

    await test.step('create test monitor via API', async () => {
      await syntheticsServices.addMonitor('Test Overview Compact View Monitor', {
        type: 'http',
        urls: 'https://www.google.com',
      });
      await pageObjects.syntheticsApp.refreshOverview();
    });

    await test.step('switch to compact view', async () => {
      await expect(page.testSubj.locator('compactView')).toBeEnabled();
      await page.testSubj.click('compactView');
      await expect(page.testSubj.locator('syntheticsCompactViewTable')).toBeVisible();
    });

    await test.step('verify compact view persists on navigation', async () => {
      await pageObjects.syntheticsApp.navigateToOverview();
      await expect(page.testSubj.locator('syntheticsCompactViewTable')).toBeVisible();
    });
  });
});
