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

test.describe('StepsDuration', { tag: tags.stateful.classic }, () => {
  test('navigates to monitor details and verifies step duration', async ({
    pageObjects,
    browserAuth,
    page,
    kbnUrl,
  }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.uptimeOverview.goto(queryParams);

    await page.click('text="test-monitor - inline"');
    const expectedMonitorUrl = kbnUrl.get(
      `/app/uptime/monitor/dGVzdC1tb25pdG9yLWlubGluZQ==/?${queryParams}`
    );
    expect(page.url()).toBe(expectedMonitorUrl);

    await page.click('text=18 seconds');
    const expectedJourneyUrl = kbnUrl.get(
      '/app/uptime/journey/9f217c22-4b17-11ec-b976-aa665a54da40/steps'
    );
    expect(page.url()).toBe(expectedJourneyUrl);

    await expect(async () => {
      await page.click('text="6 Steps - 3 succeeded"');
      await page.waitForTimeout(2 * 1000);
      await page.hover('text=8.9 sec');
      await expect(page.locator('text=Explore')).toBeVisible();
      await expect(page.locator('text=area chart')).toBeVisible();
    }).toPass({ timeout: 90 * 1000 });
  });
});
