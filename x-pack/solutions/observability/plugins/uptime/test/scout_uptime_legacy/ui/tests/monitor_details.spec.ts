/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';

const dateRangeStart = '2019-09-10T12:40:08.078Z';
const dateRangeEnd = '2019-09-11T19:40:08.078Z';
const monitorId = '0000-intermittent';

test.describe('MonitorDetails', { tag: '@local-stateful-classic' }, () => {
  test('navigates to monitor details and displays ping data', async ({
    pageObjects,
    browserAuth,
    page,
  }) => {
    await browserAuth.loginAsViewer();
    await pageObjects.monitorDetails.navigateToOverviewPage({ dateRangeEnd, dateRangeStart });
    await pageObjects.monitorDetails.navigateToMonitorDetails(monitorId);
    await pageObjects.monitorDetails.waitForLoadingToFinish();

    await test.step('filter by location and status', async () => {
      await pageObjects.monitorDetails.selectFilterItem('Location', 'mpls');
      await pageObjects.monitorDetails.setStatusFilterUp();
    });

    await test.step('verify ping list items', async () => {
      const pingIds = [
        'XZtoHm0B0I9WX_CznN-6',
        '7ZtoHm0B0I9WX_CzJ96M',
        'pptnHm0B0I9WX_Czst5X',
        'I5tnHm0B0I9WX_CzPd46',
        'y5tmHm0B0I9WX_Czx93x',
        'XZtmHm0B0I9WX_CzUt3H',
        '-JtlHm0B0I9WX_Cz3dyX',
        'k5tlHm0B0I9WX_CzaNxm',
        'NZtkHm0B0I9WX_Cz89w9',
        'zJtkHm0B0I9WX_CzftsN',
      ];

      await Promise.all(pingIds.map((id) => pageObjects.monitorDetails.waitForPingListItem(id)));
      await expect(page.testSubj.locator('uptimePingListTable')).toBeVisible({ timeout: 30_000 });
    });
  });
});
