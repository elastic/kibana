/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable playwright/no-nth-methods */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';

test.describe('OverviewSorting', { tag: tags.stateful.classic }, () => {
  const testMonitor1 = 'acb';
  const testMonitor2 = 'aCd';
  const testMonitor3 = 'Abc';

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

  test('sorts monitors correctly in overview', async ({ pageObjects, page, browserAuth }) => {
    await test.step('login and navigate to overview', async () => {
      await browserAuth.loginAsViewer();
      await pageObjects.syntheticsApp.navigateToOverview(15);
    });

    await test.step('sort alphabetical ascending', async () => {
      await expect(page.testSubj.locator('syntheticsOverviewGridItem').first()).toBeVisible();
      await page.testSubj.click('syntheticsOverviewSortButton');
      await page.click('button:has-text("Alphabetical")');

      await expect
        .poll(async () => {
          const items = page.testSubj.locator('syntheticsOverviewGridItem');
          const first = await items.nth(0).locator(`button:has-text('${testMonitor3}')`).count();
          const second = await items.nth(1).locator(`button:has-text('${testMonitor1}')`).count();
          const third = await items.nth(2).locator(`button:has-text('${testMonitor2}')`).count();
          return first + second + third;
        })
        .toBe(3);
    });

    await test.step('sort alphabetical descending', async () => {
      await page.testSubj.click('syntheticsOverviewSortButton');
      await page.click('button:has-text("Z -> A")');

      await expect
        .poll(async () => {
          const items = page.testSubj.locator('syntheticsOverviewGridItem');
          const first = await items.nth(0).locator(`button:has-text('${testMonitor2}')`).count();
          const second = await items.nth(1).locator(`button:has-text('${testMonitor1}')`).count();
          const third = await items.nth(2).locator(`button:has-text('${testMonitor3}')`).count();
          return first + second + third;
        })
        .toBe(3);
    });

    await test.step('sort by last modified', async () => {
      await page.testSubj.click('syntheticsOverviewSortButton');
      await page.click('button:has-text("Last modified")');

      await expect
        .poll(async () => {
          const items = page.testSubj.locator('syntheticsOverviewGridItem');
          const first = await items.nth(0).locator(`button:has-text('${testMonitor3}')`).count();
          const second = await items.nth(1).locator(`button:has-text('${testMonitor2}')`).count();
          const third = await items.nth(2).locator(`button:has-text('${testMonitor1}')`).count();
          return first + second + third;
        })
        .toBe(3);
    });

    await test.step('sort oldest first', async () => {
      await page.testSubj.click('syntheticsOverviewSortButton');
      await page.click('button:has-text("Oldest first")');

      await expect
        .poll(async () => {
          const items = page.testSubj.locator('syntheticsOverviewGridItem');
          const first = await items.nth(0).locator(`button:has-text('${testMonitor1}')`).count();
          const second = await items.nth(1).locator(`button:has-text('${testMonitor2}')`).count();
          const third = await items.nth(2).locator(`button:has-text('${testMonitor3}')`).count();
          return first + second + third;
        })
        .toBe(3);
    });
  });
});
