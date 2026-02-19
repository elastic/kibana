/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';

const queryParams = {
  dateRangeStart: '2021-11-21T22:06:06.502Z',
  dateRangeEnd: '2021-11-21T22:10:08.203Z',
};

test.describe('StepsDuration', { tag: tags.stateful.classic }, () => {
  test('navigates to monitor details and verifies step duration', async ({
    pageObjects,
    browserAuth,
    page,
  }) => {
    await browserAuth.loginAsViewer();
    await pageObjects.uptimeOverview.goto(queryParams);

    await test.step('navigate to monitor details', async () => {
      await page.getByText('test-monitor - inline').click();
      await expect(page).toHaveURL(/\/app\/uptime\/monitor\/dGVzdC1tb25pdG9yLWlubGluZQ/);
    });

    await test.step('navigate to journey steps', async () => {
      // eslint-disable-next-line playwright/no-nth-methods
      await page.getByText('18 seconds').first().click();
      await expect(page).toHaveURL(
        /\/app\/uptime\/journey\/9f217c22-4b17-11ec-b976-aa665a54da40\/steps/
      );
    });

    await test.step('verify step duration chart', async () => {
      await expect(async () => {
        // eslint-disable-next-line playwright/no-nth-methods
        await page.getByText('6 Steps - 3 succeeded').first().click();
        await page.hover('text=8.9 sec');
        await expect(page.getByText('Explore')).toBeVisible();
        await expect(page.getByText('area chart')).toBeVisible();
      }).toPass({ timeout: 90_000 });
    });
  });
});
