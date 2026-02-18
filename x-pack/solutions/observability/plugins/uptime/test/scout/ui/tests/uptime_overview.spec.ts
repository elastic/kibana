/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { test } from '../fixtures';

test.describe('UptimeOverview', { tag: tags.stateful.classic }, () => {
  test('navigates to overview and clicks monitor', async ({
    pageObjects,
    browserAuth,
    page,
  }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.uptimeOverview.goto('dateRangeStart=2018-01-01&dateRangeEnd=now');

    await pageObjects.uptimeOverview.clickSettingsLink();
    await page.waitForTimeout(5 * 1000);

    const currentIndex = await pageObjects.uptimeOverview.getHeartbeatIndicesInput();
    if (currentIndex !== 'heartbeat-*') {
      await pageObjects.uptimeOverview.setHeartbeatIndices('heartbeat-*');
    }

    await page.goBack();
    await pageObjects.uptimeOverview.clickOverviewPage();
    await page.locator('div.euiBasicTable').click({ timeout: 60 * 1000 });
    await pageObjects.uptimeOverview.clickMonitorLink('0001-up');
  });
});
