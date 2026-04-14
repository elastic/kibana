/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../../fixtures';
import { EXTENDED_TIMEOUT } from '../../fixtures/constants';

test.describe(
  'Hosts Page - Empty State',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test('should show empty state when no data is present', async ({
      browserAuth,
      pageObjects: { hostsPage },
    }) => {
      await browserAuth.loginAsViewer();

      await test.step('navigate to hosts view without any data', async () => {
        await hostsPage.goToHostsPage();
      });

      await test.step('verify the hosts page shows zero hosts', async () => {
        await expect(hostsPage.kpiGrid.getByTestId('hostsViewKPI-hostsCount')).toBeVisible({
          timeout: EXTENDED_TIMEOUT,
        });
        await expect(
          hostsPage.kpiGrid.getByTestId('hostsViewKPI-hostsCount').locator('.echMetricText__value')
        ).toHaveAttribute('title', '0');
      });

      await test.step('verify the table shows no data message', async () => {
        await expect(hostsPage.tableNoData).toBeVisible();
      });
    });
  }
);
