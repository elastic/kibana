/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';

const FIRST_TAG = 'a';
const SECOND_TAG = 'b';

test.describe('FilterMonitors', { tag: tags.stateful.classic }, () => {
  test.beforeAll(async ({ syntheticsServices }) => {
    await syntheticsServices.cleanUp();
  });

  test.afterAll(async ({ syntheticsServices }) => {
    await syntheticsServices.cleanUp();
  });

  test('filters monitors by tags with AND/OR logic', async ({
    pageObjects,
    page,
    browserAuth,
    syntheticsServices,
  }) => {
    await test.step('login and navigate to overview', async () => {
      await browserAuth.loginAsViewer();
      await pageObjects.syntheticsApp.navigateToOverview(15);
    });

    await test.step('create test monitors with tags', async () => {
      const common = { type: 'http', urls: 'https://www.google.com' };
      await syntheticsServices.addMonitor('Test Filter Monitors 1 Tag', {
        ...common,
        tags: [FIRST_TAG],
      });
      await syntheticsServices.addMonitor('Test Filter Monitors 2 Tags', {
        ...common,
        tags: [FIRST_TAG, SECOND_TAG],
      });
      await pageObjects.syntheticsApp.refreshOverview();
    });

    await test.step('filter by tags with AND', async () => {
      await page.getByLabel('expands filter group for Tags filter').click();
      await page.getByRole('option', { name: FIRST_TAG }).click();
      await page.getByRole('option', { name: SECOND_TAG }).click();
      await page.testSubj.click('tagsLogicalOperatorSwitch');
      await page.testSubj.click('o11yFieldValueSelectionApplyButton');

      await expect(page.getByText('Showing 1 Monitor')).toBeVisible({ timeout: 10_000 });
    });

    await test.step('filter by tags with OR', async () => {
      await page.getByLabel('expands filter group for Tags filter').click();
      await page.testSubj.click('tagsLogicalOperatorSwitch');
      await page.testSubj.click('o11yFieldValueSelectionApplyButton');

      await expect(page.getByText('Showing 2 Monitors')).toBeVisible({ timeout: 10_000 });
    });
  });
});
